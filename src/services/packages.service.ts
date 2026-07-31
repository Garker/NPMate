import type {
  PackageCommandRequest,
  PackageCommandResult,
  ProjectDependencies,
} from '@/types/package'

function requireDesktopApi() {
  if (!window.npmate) {
    throw new Error('包管理功能仅可在 Electron 桌面应用中使用。')
  }
  return window.npmate.packages
}

async function unwrap<T>(
  promise: Promise<{ ok: true; data: T } | { ok: false; error: string }>,
): Promise<T> {
  const result = await promise
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export const packagesService = {
  listInstalled: (projectId: string): Promise<ProjectDependencies> =>
    unwrap(requireDesktopApi().listInstalled(projectId)),
  execute: (request: PackageCommandRequest): Promise<PackageCommandResult> =>
    unwrap(requireDesktopApi().execute(request)),
}
