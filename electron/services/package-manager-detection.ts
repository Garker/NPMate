import { access } from 'node:fs/promises'
import { join } from 'node:path'
import type { PackageManager } from '../../src/types/project'

export interface LockDetection {
  packageManager: PackageManager
  lockFile: string | null
}

const lockCandidates: Array<[string, PackageManager]> = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['package-lock.json', 'npm'],
  ['yarn.lock', 'yarn'],
]

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * 严格按照需求中的锁文件优先级判断包管理器。
 */
export async function detectPackageManager(
  projectPath: string,
): Promise<LockDetection> {
  for (const [lockFile, packageManager] of lockCandidates) {
    if (await exists(join(projectPath, lockFile))) {
      return { packageManager, lockFile }
    }
  }

  return { packageManager: 'unknown', lockFile: null }
}
