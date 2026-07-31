export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'unknown'

export interface ProjectRecord {
  id: string
  name: string
  path: string
  framework: string
  nodeVersion: string
  packageManager: PackageManager
  lockFile: string | null
  dependenciesCount: number
  devDependenciesCount: number
  nodeModulesSize: number
  scannedAt: string
  createdAt: string
  updatedAt: string
}

export type ProjectOperationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }
