import { create } from 'zustand'
import { registryService } from '@/services/registry.service'
import type {
  RegistryPackageDetail,
  RegistryPackageSummary,
} from '@/types/package'

interface RegistryState {
  query: string
  results: RegistryPackageSummary[]
  detail: RegistryPackageDetail | null
  searching: boolean
  loadingDetail: boolean
  error: string | null
  search: (query: string) => Promise<void>
  loadDetail: (name: string) => Promise<void>
  closeDetail: () => void
  clearError: () => void
}

export const useRegistryStore = create<RegistryState>((set) => ({
  query: '',
  results: [],
  detail: null,
  searching: false,
  loadingDetail: false,
  error: null,

  search: async (query) => {
    set({ searching: true, error: null, query })
    try {
      set({ results: await registryService.search(query) })
    } catch (error) {
      set({
        results: [],
        error: error instanceof Error ? error.message : 'npm 包搜索失败。',
      })
    } finally {
      set({ searching: false })
    }
  },

  loadDetail: async (name) => {
    set({ loadingDetail: true, detail: null, error: null })
    try {
      set({ detail: await registryService.detail(name) })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '包详情加载失败。',
      })
    } finally {
      set({ loadingDetail: false })
    }
  },

  closeDetail: () => set({ detail: null }),
  clearError: () => set({ error: null }),
}))
