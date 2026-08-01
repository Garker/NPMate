import { spawn } from 'node:child_process'
import { lstat, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  DependencyGraphData,
  DependencyUpdate,
  DuplicateDependency,
  ModuleSizeEntry,
  NodeModulesAnalysis,
  UpgradeType,
} from '../../src/types/analysis'
import type { InstalledPackage } from '../../src/types/package'
import { PackageManagerService } from './package-manager.service'
import { ProjectService } from './project.service'

interface NpmTreeNode {
  name?: string
  version?: string
  dependencies?: Record<string, NpmTreeNode>
}

interface InstalledPackageJson {
  name?: string
  version?: string
}

function numericVersion(value: string): [number, number, number] | null {
  const match = value.match(/(\d+)\.(\d+)\.(\d+)/)
  return match
    ? [Number(match[1]), Number(match[2]), Number(match[3])]
    : null
}

function upgradeType(current: string, latest: string): UpgradeType {
  const from = numericVersion(current)
  const to = numericVersion(latest)
  if (!from || !to) return 'unknown'
  if (from[0] !== to[0]) return 'major'
  if (from[1] !== to[1]) return 'minor'
  if (from[2] !== to[2]) return 'patch'
  return 'current'
}

async function latestVersion(name: string): Promise<string> {
  const response = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(name)}/latest`,
    { signal: AbortSignal.timeout(12_000) },
  )
  if (!response.ok) throw new Error(`无法检查 ${name} 的最新版本。`)
  return ((await response.json()) as { version?: string }).version ?? '—'
}

async function directorySize(path: string): Promise<number> {
  let total = 0
  const pending = [path]
  while (pending.length) {
    const current = pending.pop()
    if (!current) continue
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const target = join(current, entry.name)
      if (entry.isDirectory()) pending.push(target)
      else if (entry.isFile()) {
        try {
          total += (await lstat(target)).size
        } catch {
          // 扫描期间被删除的文件不影响其余统计。
        }
      }
    }
  }
  return total
}

async function installedPackageDirectories(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true })
  const directories: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const path = join(root, entry.name)
    if (entry.name.startsWith('@')) {
      const scoped = await readdir(path, { withFileTypes: true })
      directories.push(
        ...scoped.filter((item) => item.isDirectory()).map((item) => join(path, item.name)),
      )
    } else {
      directories.push(path)
    }
  }
  return directories
}

function runNpmTree(cwd: string): Promise<NpmTreeNode> {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['ls', '--all', '--json'], {
      cwd,
      shell: false,
      env: process.env,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()))
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()))
    child.on('error', reject)
    child.on('close', () => {
      try {
        resolve(JSON.parse(stdout) as NpmTreeNode)
      } catch {
        reject(new Error(stderr.trim() || '无法读取 npm 依赖树。'))
      }
    })
  })
}

function duplicateVersions(tree: NpmTreeNode): DuplicateDependency[] {
  const versions = new Map<string, Set<string>>()
  const visit = (node: NpmTreeNode) => {
    for (const [name, child] of Object.entries(node.dependencies ?? {})) {
      if (child.version) {
        const values = versions.get(name) ?? new Set<string>()
        values.add(child.version)
        versions.set(name, values)
      }
      visit(child)
    }
  }
  visit(tree)
  return [...versions.entries()]
    .filter(([, values]) => values.size > 1)
    .map(([name, values]) => ({ name, versions: [...values].sort() }))
    .sort((left, right) => right.versions.length - left.versions.length)
}

export class AnalysisService {
  private readonly projects = new ProjectService()
  private readonly packages = new PackageManagerService()

  async updates(projectId: string): Promise<DependencyUpdate[]> {
    const installed = await this.packages.list(projectId)
    return Promise.all(
      installed.dependencies.map(async (item: InstalledPackage) => {
        const latest = await latestVersion(item.name)
        return {
          name: item.name,
          currentRange: item.versionRange,
          currentVersion: numericVersion(item.versionRange)?.join('.') ?? null,
          latestVersion: latest,
          kind: item.kind,
          upgradeType: upgradeType(item.versionRange, latest),
        }
      }),
    )
  }

  async graph(projectId: string): Promise<DependencyGraphData> {
    const project = this.projects.get(projectId)
    const tree = await runNpmTree(project.path)
    const nodes: DependencyGraphData['nodes'] = []
    const edges: DependencyGraphData['edges'] = []
    let truncated = false
    const visit = (
      name: string,
      node: NpmTreeNode,
      id: string,
      parentId: string | null,
      depth: number,
    ) => {
      if (nodes.length >= 500) {
        truncated = true
        return
      }
      nodes.push({ id, name, version: node.version ?? '—', depth })
      if (parentId) edges.push({ id: `${parentId}->${id}`, source: parentId, target: id })
      for (const [childName, child] of Object.entries(node.dependencies ?? {})) {
        visit(childName, child, `${id}/${childName}`, id, depth + 1)
      }
    }
    visit(tree.name ?? project.name, tree, 'root', null, 0)
    return { nodes, edges, truncated }
  }

  async nodeModules(projectId: string): Promise<NodeModulesAnalysis> {
    const project = this.projects.get(projectId)
    const root = join(project.path, 'node_modules')
    let directories: string[]
    try {
      directories = await installedPackageDirectories(root)
    } catch {
      throw new Error('项目尚未安装 node_modules。')
    }
    const largestPackages: ModuleSizeEntry[] = await Promise.all(
      directories.map(async (path) => {
        let metadata: InstalledPackageJson = {}
        try {
          metadata = JSON.parse(await readFile(join(path, 'package.json'), 'utf8')) as InstalledPackageJson
        } catch {
          // 缺少元数据时仍统计目录体积。
        }
        return {
          name: metadata.name ?? path.split('/').pop() ?? path,
          version: metadata.version ?? '—',
          size: await directorySize(path),
        }
      }),
    )
    largestPackages.sort((left, right) => right.size - left.size)
    const tree = await runNpmTree(project.path)
    return {
      totalSize: largestPackages.reduce((sum, item) => sum + item.size, 0),
      largestPackages: largestPackages.slice(0, 20),
      duplicates: duplicateVersions(tree),
      dedupeCommand:
        project.packageManager === 'pnpm'
          ? 'pnpm dedupe'
          : project.packageManager === 'bun'
            ? 'bun install'
          : project.packageManager === 'yarn'
            ? 'yarn dedupe'
            : 'npm dedupe',
    }
  }
}
