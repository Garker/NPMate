import type { PackageCommandRequest } from '../../src/types/package'

export function createPnpmArgs(request: PackageCommandRequest): string[] {
  const target = request.version
    ? `${request.packageName}@${request.version}`
    : request.packageName
  if (request.action === 'uninstall') return ['remove', request.packageName]
  if (request.action === 'upgrade') return ['update', target]
  return ['add', target, ...(request.dev ? ['--save-dev'] : [])]
}
