import { create } from 'zustand'
import { aiService } from '@/services/ai.service'
import type {
  AIConfig,
  AITestResult,
  AssistantResponse,
  SaveAIConfigInput,
} from '@/types/ai'

interface AIState {
  config: AIConfig | null
  testResult: AITestResult | null
  assistantResponse: AssistantResponse | null
  loading: boolean
  testing: boolean
  assisting: boolean
  error: string | null
  load: () => Promise<void>
  save: (input: SaveAIConfigInput) => Promise<boolean>
  deleteApiKey: () => Promise<void>
  test: (input: SaveAIConfigInput) => Promise<void>
  assist: (projectId: string, prompt: string) => Promise<void>
  clearError: () => void
}

export const useAIStore = create<AIState>((set) => ({
  config: null,
  testResult: null,
  assistantResponse: null,
  loading: false,
  testing: false,
  assisting: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null })
    try {
      set({ config: await aiService.getConfig() })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'AI 配置加载失败。' })
    } finally {
      set({ loading: false })
    }
  },
  save: async (input) => {
    set({ loading: true, error: null, testResult: null })
    try {
      set({ config: await aiService.saveConfig(input) })
      return true
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'AI 配置保存失败。' })
      return false
    } finally {
      set({ loading: false })
    }
  },
  deleteApiKey: async () => {
    set({ loading: true, error: null, testResult: null })
    try {
      set({ config: await aiService.deleteApiKey() })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'API Key 删除失败。' })
    } finally {
      set({ loading: false })
    }
  },
  test: async (input) => {
    set({ testing: true, error: null, testResult: null })
    try {
      set({ testResult: await aiService.test(input) })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'AI 连接测试失败。' })
    } finally {
      set({ testing: false })
    }
  },
  assist: async (projectId, prompt) => {
    set({ assisting: true, error: null, assistantResponse: null })
    try {
      set({ assistantResponse: await aiService.assist({ projectId, prompt }) })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Assistant 请求失败。' })
    } finally {
      set({ assisting: false })
    }
  },
  clearError: () => set({ error: null }),
}))
