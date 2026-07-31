import type { PackageCommandRequest } from '../../src/types/package'

export function createYarnArgs(request: PackageCommandRequest): string[] {
  const target = request.version
    ? `${request.packageName}@${request.version}`
    : request.packageName
  if (request.action === 'uninstall') return ['remove', request.packageName]
  if (request.action === 'upgrade') return ['upgrade', target]
  return ['add', target, ...(request.dev ? ['--dev'] : [])]
}
