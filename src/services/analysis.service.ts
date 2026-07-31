import type {
  DependencyGraphData,
  DependencyUpdate,
  NodeModulesAnalysis,
} from '@/types/analysis'

function api() {
  if (!window.npmate) throw new Error('依赖分析仅可在 Electron 中使用。')
  return window.npmate.analysis
}

async function unwrap<T>(
  promise: Promise<{ ok: true; data: T } | { ok: false; error: string }>,
): Promise<T> {
  const result = await promise
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export const analysisService = {
  updates: (projectId: string): Promise<DependencyUpdate[]> =>
    unwrap(api().updates(projectId)),
  graph: (projectId: string): Promise<DependencyGraphData> =>
    unwrap(api().graph(projectId)),
  nodeModules: (projectId: string): Promise<NodeModulesAnalysis> =>
    unwrap(api().nodeModules(projectId)),
}
