import type { DependencyKind, PackageOperationResult } from './package'

export type UpgradeType = 'major' | 'minor' | 'patch' | 'current' | 'unknown'

export interface DependencyUpdate {
  name: string
  currentRange: string
  currentVersion: string | null
  latestVersion: string
  kind: DependencyKind
  upgradeType: UpgradeType
}

export interface DependencyGraphNode {
  id: string
  name: string
  version: string
  depth: number
}

export interface DependencyGraphEdge {
  id: string
  source: string
  target: string
}

export interface DependencyGraphData {
  nodes: DependencyGraphNode[]
  edges: DependencyGraphEdge[]
  truncated: boolean
}

export interface ModuleSizeEntry {
  name: string
  version: string
  size: number
}

export interface DuplicateDependency {
  name: string
  versions: string[]
}

export interface NodeModulesAnalysis {
  totalSize: number
  largestPackages: ModuleSizeEntry[]
  duplicates: DuplicateDependency[]
  dedupeCommand: string
}

export type AnalysisOperationResult<T> = PackageOperationResult<T>
