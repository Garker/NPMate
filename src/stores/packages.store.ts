import { create } from 'zustand'
import { packagesService } from '@/services/packages.service'
import type {
  InstalledPackage,
  PackageCommandRequest,
  PackageCommandResult,
} from '@/types/package'

interface PackagesState {
  projectId: string | null
  dependencies: InstalledPackage[]
  loading: boolean
  executingPackage: string | null
  error: string | null
  lastResult: PackageCommandResult | null
  load: (projectId: string) => Promise<void>
  execute: (request: PackageCommandRequest) => Promise<boolean>
  reset: () => void
  clearError: () => void
}

export const usePackagesStore = create<PackagesState>((set, get) => ({
  projectId: null,
  dependencies: [],
  loading: false,
  executingPackage: null,
  error: null,
  lastResult: null,

  load: async (projectId) => {
    set({ loading: true, error: null, projectId })
    try {
      const result = await packagesService.listInstalled(projectId)
      if (get().projectId === projectId) {
        set({ dependencies: result.dependencies })
      }
    } catch (error) {
      set({
        dependencies: [],
        error: error instanceof Error ? error.message : '依赖读取失败。',
      })
    } finally {
      if (get().projectId === projectId) set({ loading: false })
    }
  },

  execute: async (request) => {
    set({ executingPackage: request.packageName, error: null })
    try {
      const lastResult = await packagesService.execute(request)
      set({ lastResult })
      await get().load(request.projectId)
      return true
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '包管理命令执行失败。',
      })
      return false
    } finally {
      set({ executingPackage: null })
    }
  },

  reset: () =>
    set({
      projectId: null,
      dependencies: [],
      error: null,
      lastResult: null,
    }),
  clearError: () => set({ error: null }),
}))
