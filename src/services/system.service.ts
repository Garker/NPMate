import type { EnvironmentInfo, OperationHistoryEntry } from '@/types/system'

function api() {
  if (!window.npmate) throw new Error('系统设置仅可在 Electron 中使用。')
  return window.npmate
}

async function unwrap<T>(
  promise: Promise<{ ok: true; data: T } | { ok: false; error: string }>,
): Promise<T> {
  const result = await promise
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export const systemService = {
  environment: (): Promise<EnvironmentInfo> =>
    unwrap(api().system.environment()),
  setRegistry: (url: string): Promise<EnvironmentInfo> =>
    unwrap(api().system.setRegistry(url)),
  history: (): Promise<OperationHistoryEntry[]> =>
    unwrap(api().history.list()),
}
