import type { PackageCommandRequest } from '../../src/types/package'

export function createNpmArgs(request: PackageCommandRequest): string[] {
  const target = request.version
    ? `${request.packageName}@${request.version}`
    : request.packageName
  if (request.action === 'uninstall') return ['uninstall', request.packageName]
  if (request.action === 'upgrade') return ['install', target]
  return ['install', target, ...(request.dev ? ['--save-dev'] : [])]
}
