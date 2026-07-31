import type {
  RegistryPackageDetail,
  RegistryPackageSummary,
} from '@/types/package'

function requireRegistryApi() {
  if (!window.npmate) {
    throw new Error('npm Registry 搜索仅可在 Electron 桌面应用中使用。')
  }
  return window.npmate.registry
}

async function unwrap<T>(
  promise: Promise<{ ok: true; data: T } | { ok: false; error: string }>,
): Promise<T> {
  const result = await promise
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export const registryService = {
  search: (query: string): Promise<RegistryPackageSummary[]> =>
    unwrap(requireRegistryApi().search(query)),
  detail: (name: string): Promise<RegistryPackageDetail> =>
    unwrap(requireRegistryApi().detail(name)),
}
