import type { PackageAction, PackageOperationResult } from './package'

export interface ToolVersion {
  name: 'node' | 'npm' | 'pnpm' | 'yarn'
  version: string | null
}

export interface EnvironmentInfo {
  tools: ToolVersion[]
  managers: {
    nvm: boolean
    fnm: boolean
    volta: boolean
  }
  registry: string
}

export interface OperationHistoryEntry {
  id: string
  projectId: string
  projectName: string
  action: PackageAction
  command: string
  success: boolean
  exitCode: number
  output: string
  createdAt: string
}

export type SystemOperationResult<T> = PackageOperationResult<T>
