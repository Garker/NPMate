import { create } from 'zustand'
import type { PageKey } from '@/types/navigation'

type ColorMode = 'light' | 'dark'

interface AppState {
  activePage: PageKey
  colorMode: ColorMode
  selectedProjectId: string | null
  setActivePage: (page: PageKey) => void
  toggleColorMode: () => void
  setSelectedProjectId: (projectId: string | null) => void
}

/**
 * 应用壳状态与业务数据分离，项目数据由 projects.store 独立维护。
 * 项目、依赖和操作历史将在对应阶段拆分为独立 store。
 */
export const useAppStore = create<AppState>((set) => ({
  activePage: 'dashboard',
  colorMode: 'light',
  selectedProjectId: null,
  setActivePage: (activePage) => set({ activePage }),
  toggleColorMode: () =>
    set((state) => ({
      colorMode: state.colorMode === 'dark' ? 'light' : 'dark',
    })),
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
}))
