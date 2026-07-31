import type { ProjectRecord } from '@/types/project'

function requireDesktopApi() {
  if (!window.npmate) {
    throw new Error('项目管理只能在 Electron 桌面应用中使用。')
  }
  return window.npmate.projects
}

function unwrap<T>(result: { ok: true; data: T } | { ok: false; error: string }): T {
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data
}

export const projectsService = {
  async list(): Promise<ProjectRecord[]> {
    return unwrap(await requireDesktopApi().list())
  },
  async add(): Promise<ProjectRecord | null> {
    return unwrap(await requireDesktopApi().add())
  },
  async refresh(id: string): Promise<ProjectRecord> {
    return unwrap(await requireDesktopApi().refresh(id))
  },
  async remove(id: string): Promise<void> {
    unwrap(await requireDesktopApi().remove(id))
  },
  async restore(id: string): Promise<ProjectRecord> {
    return unwrap(await requireDesktopApi().restore(id))
  },
  async openFolder(id: string): Promise<void> {
    unwrap(await requireDesktopApi().openFolder(id))
  },
}
