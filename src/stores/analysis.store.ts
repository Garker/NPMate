import { create } from 'zustand'
import { analysisService } from '@/services/analysis.service'
import type {
  DependencyGraphData,
  DependencyUpdate,
  NodeModulesAnalysis,
} from '@/types/analysis'

interface AnalysisState {
  updates: DependencyUpdate[]
  graph: DependencyGraphData | null
  modules: NodeModulesAnalysis | null
  loading: 'updates' | 'graph' | 'modules' | null
  error: string | null
  loadUpdates: (projectId: string) => Promise<void>
  loadGraph: (projectId: string) => Promise<void>
  loadModules: (projectId: string) => Promise<void>
  clearError: () => void
}

async function loadValue<T>(
  key: AnalysisState['loading'],
  work: () => Promise<T>,
  apply: (value: T) => Partial<AnalysisState>,
  set: (value: Partial<AnalysisState>) => void,
) {
  set({ loading: key, error: null })
  try {
    set(apply(await work()))
  } catch (error) {
    set({ error: error instanceof Error ? error.message : '依赖分析失败。' })
  } finally {
    set({ loading: null })
  }
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  updates: [],
  graph: null,
  modules: null,
  loading: null,
  error: null,
  loadUpdates: (projectId) =>
    loadValue('updates', () => analysisService.updates(projectId), (updates) => ({ updates }), set),
  loadGraph: (projectId) =>
    loadValue('graph', () => analysisService.graph(projectId), (graph) => ({ graph }), set),
  loadModules: (projectId) =>
    loadValue('modules', () => analysisService.nodeModules(projectId), (modules) => ({ modules }), set),
  clearError: () => set({ error: null }),
}))
