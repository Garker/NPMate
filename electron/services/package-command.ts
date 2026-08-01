import type { PackageCommandRequest } from '../../src/types/package'
import type { PackageManager } from '../../src/types/project'
import { createBunArgs } from './bun.service'
import { createNpmArgs } from './npm.service'
import { createPnpmArgs } from './pnpm.service'
import { createYarnArgs } from './yarn.service'

export function commandArgs(
  manager: Exclude<PackageManager, 'unknown'>,
  request: PackageCommandRequest,
): string[] {
  if (manager === 'npm') return createNpmArgs(request)
  if (manager === 'pnpm') return createPnpmArgs(request)
  if (manager === 'bun') return createBunArgs(request)
  return createYarnArgs(request)
}
