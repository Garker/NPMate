import { create } from 'zustand'
import { systemService } from '@/services/system.service'
import type { EnvironmentInfo, OperationHistoryEntry } from '@/types/system'

interface SystemState {
  environment: EnvironmentInfo | null
  history: OperationHistoryEntry[]
  loading: boolean
  changingRegistry: boolean
  error: string | null
  load: () => Promise<void>
  setRegistry: (url: string) => Promise<boolean>
  clearError: () => void
}

export const useSystemStore = create<SystemState>((set) => ({
  environment: null,
  history: [],
  loading: false,
  changingRegistry: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null })
    try {
      const [environment, history] = await Promise.all([
        systemService.environment(),
        systemService.history(),
      ])
      set({ environment, history })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '系统信息加载失败。' })
    } finally {
      set({ loading: false })
    }
  },
  setRegistry: async (url) => {
    set({ changingRegistry: true, error: null })
    try {
      set({ environment: await systemService.setRegistry(url) })
      return true
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Registry 更新失败。' })
      return false
    } finally {
      set({ changingRegistry: false })
    }
  },
  clearError: () => set({ error: null }),
}))
