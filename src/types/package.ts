import type { PackageManager, ProjectOperationResult } from './project'

export type DependencyKind = 'dependency' | 'devDependency'
export type PackageAction = 'install' | 'uninstall' | 'upgrade'
export type TrackedPackageAction = Exclude<PackageAction, 'install'>
export type PackageTaskStatus = 'queued' | 'running' | 'success' | 'failed'

export interface InstalledPackage {
  name: string
  versionRange: string
  kind: DependencyKind
}

export interface ProjectDependencies {
  projectId: string
  packageManager: PackageManager
  dependencies: InstalledPackage[]
}

export interface PackageCommandRequest {
  projectId: string
  action: PackageAction
  packageName: string
  version?: string
  dev?: boolean
}

export interface PackageCommandResult {
  action: PackageAction
  command: string
  exitCode: number
  stdout: string
  stderr: string
  startedAt: string
  finishedAt: string
}

export interface PackageOperationTask {
  id: string
  request: PackageCommandRequest & { action: TrackedPackageAction }
  status: PackageTaskStatus
  error: string | null
}

export interface RegistryPackageSummary {
  name: string
  version: string
  description: string
  author: string
  weeklyDownloads: number | null
  npmUrl: string
  repositoryUrl: string | null
}

export interface RegistryPackageVersion {
  version: string
  publishedAt: string | null
  deprecated: string | null
}

export interface RegistryPackageDetail extends RegistryPackageSummary {
  readme: string
  license: string | null
  homepage: string | null
  versions: RegistryPackageVersion[]
  keywords: string[]
}

export type PackageOperationResult<T> = ProjectOperationResult<T>
