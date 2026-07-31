import { create } from 'zustand'
import { projectsService } from '@/services/projects.service'
import type { ProjectRecord } from '@/types/project'

interface ProjectsState {
  projects: ProjectRecord[]
  selectedProjectId: string | null
  lastRemoved: ProjectRecord | null
  loading: boolean
  scanningProjectId: string | null
  error: string | null
  load: () => Promise<void>
  add: () => Promise<void>
  refresh: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  restoreLastRemoved: () => Promise<void>
  openFolder: (id: string) => Promise<void>
  select: (id: string | null) => void
  clearError: () => void
}

function replaceProject(
  projects: ProjectRecord[],
  project: ProjectRecord,
): ProjectRecord[] {
  const exists = projects.some((item) => item.id === project.id)
  return exists
    ? projects.map((item) => (item.id === project.id ? project : item))
    : [...projects, project]
}

/**
 * 项目状态与应用导航状态分离，便于后续按模块扩展。
 */
export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  lastRemoved: null,
  loading: false,
  scanningProjectId: null,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const projects = await projectsService.list()
      set((state) => ({
        projects,
        selectedProjectId:
          state.selectedProjectId &&
          projects.some((item) => item.id === state.selectedProjectId)
            ? state.selectedProjectId
            : (projects[0]?.id ?? null),
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '项目加载失败。' })
    } finally {
      set({ loading: false })
    }
  },

  add: async () => {
    set({ loading: true, error: null })
    try {
      const project = await projectsService.add()
      if (!project) return
      set((state) => ({
        projects: replaceProject(state.projects, project),
        selectedProjectId: project.id,
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '项目添加失败。' })
    } finally {
      set({ loading: false })
    }
  },

  refresh: async (id) => {
    set({ scanningProjectId: id, error: null })
    try {
      const project = await projectsService.refresh(id)
      set((state) => ({
        projects: replaceProject(state.projects, project),
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '项目刷新失败。' })
    } finally {
      set({ scanningProjectId: null })
    }
  },

  remove: async (id) => {
    const project = get().projects.find((item) => item.id === id)
    if (!project) return

    set((state) => ({
      projects: state.projects.filter((item) => item.id !== id),
      selectedProjectId:
        state.selectedProjectId === id
          ? (state.projects.find((item) => item.id !== id)?.id ?? null)
          : state.selectedProjectId,
      lastRemoved: project,
      error: null,
    }))

    try {
      await projectsService.remove(id)
    } catch (error) {
      set((state) => ({
        projects: replaceProject(state.projects, project),
        error: error instanceof Error ? error.message : '项目移除失败。',
      }))
    }
  },

  restoreLastRemoved: async () => {
    const project = get().lastRemoved
    if (!project) return
    try {
      const restored = await projectsService.restore(project.id)
      set((state) => ({
        projects: replaceProject(state.projects, restored),
        selectedProjectId: restored.id,
        lastRemoved: null,
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '项目恢复失败。' })
    }
  },

  openFolder: async (id) => {
    try {
      await projectsService.openFolder(id)
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '目录打开失败。' })
    }
  },

  select: (selectedProjectId) => set({ selectedProjectId }),
  clearError: () => set({ error: null }),
}))
