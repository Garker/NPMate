import { randomUUID } from 'node:crypto'
import { access, lstat, readFile, readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { and, eq, isNull } from 'drizzle-orm'
import { getDatabase } from '../../database/client'
import { projects } from '../../database/schema'
import type {
  PackageManager,
  ProjectRecord,
} from '../../src/types/project'

interface PackageJson {
  name?: string
  engines?: {
    node?: string
  }
  packageManager?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

interface LockDetection {
  packageManager: PackageManager
  lockFile: string | null
}

const lockCandidates: Array<[string, PackageManager]> = [
  ['pnpm-lock.yaml', 'pnpm'],
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
async function detectPackageManager(projectPath: string): Promise<LockDetection> {
  for (const [lockFile, packageManager] of lockCandidates) {
    if (await exists(join(projectPath, lockFile))) {
      return { packageManager, lockFile }
    }
  }

  return { packageManager: 'unknown', lockFile: null }
}

function detectFramework(packageJson: PackageJson): string {
  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  if (allDependencies.next) return 'Next.js'
  if (allDependencies.nuxt) return 'Nuxt'
  if (allDependencies['@angular/core']) return 'Angular'
  if (allDependencies['@nestjs/core']) return 'NestJS'
  if (allDependencies.svelte || allDependencies['@sveltejs/kit']) return 'Svelte'
  if (allDependencies.vue) return allDependencies.vite ? 'Vue + Vite' : 'Vue'
  if (allDependencies.react) return allDependencies.vite ? 'React + Vite' : 'React'
  if (allDependencies.express) return 'Express'
  if (allDependencies.vite) return 'Vite'
  return 'Node.js'
}

async function readFirstTextFile(paths: string[]): Promise<string | null> {
  for (const path of paths) {
    try {
      const value = (await readFile(path, 'utf8')).trim()
      if (value) return value
    } catch {
      // 可选版本文件不存在时继续检查下一项。
    }
  }
  return null
}

async function detectNodeVersion(
  projectPath: string,
  packageJson: PackageJson,
): Promise<string> {
  if (packageJson.engines?.node) {
    return packageJson.engines.node
  }

  const versionFile = await readFirstTextFile([
    join(projectPath, '.nvmrc'),
    join(projectPath, '.node-version'),
  ])

  return versionFile ?? process.version
}

/**
 * 使用 fs 递归统计文件大小，跳过符号链接以避免 pnpm 链接环。
 */
async function calculateDirectorySize(directoryPath: string): Promise<number> {
  if (!(await exists(directoryPath))) return 0

  let total = 0
  const pending = [directoryPath]

  while (pending.length > 0) {
    const current = pending.pop()
    if (!current) continue

    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const entryPath = join(current, entry.name)
      if (entry.isDirectory()) {
        pending.push(entryPath)
      } else if (entry.isFile()) {
        try {
          total += (await lstat(entryPath)).size
        } catch {
          // 某个文件扫描期间被删除时忽略，保留其余统计结果。
        }
      }
    }
  }

  return total
}

function toProjectRecord(
  row: typeof projects.$inferSelect,
): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    framework: row.framework,
    nodeVersion: row.nodeVersion,
    packageManager: row.packageManager as PackageManager,
    lockFile: row.lockFile,
    dependenciesCount: row.dependenciesCount,
    devDependenciesCount: row.devDependenciesCount,
    nodeModulesSize: row.nodeModulesSize,
    scannedAt: row.scannedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function scanProjectDirectory(
  projectPath: string,
): Promise<Omit<ProjectRecord, 'id' | 'createdAt' | 'updatedAt'>> {
  const packageJsonPath = join(projectPath, 'package.json')
  let packageJson: PackageJson

  try {
    packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as PackageJson
  } catch {
    throw new Error('所选目录缺少可读取的 package.json。')
  }

  const lock = await detectPackageManager(projectPath)
  const scannedAt = new Date().toISOString()

  return {
    name: packageJson.name?.trim() || basename(projectPath),
    path: projectPath,
    framework: detectFramework(packageJson),
    nodeVersion: await detectNodeVersion(projectPath, packageJson),
    packageManager: lock.packageManager,
    lockFile: lock.lockFile,
    dependenciesCount: Object.keys(packageJson.dependencies ?? {}).length,
    devDependenciesCount: Object.keys(packageJson.devDependencies ?? {}).length,
    nodeModulesSize: await calculateDirectorySize(
      join(projectPath, 'node_modules'),
    ),
    scannedAt,
  }
}

export class ProjectService {
  get(id: string): ProjectRecord {
    const project = getDatabase()
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.removedAt)))
      .get()

    if (!project) {
      throw new Error('项目不存在或已被移除。')
    }
    return toProjectRecord(project)
  }

  list(): ProjectRecord[] {
    return getDatabase()
      .select()
      .from(projects)
      .where(isNull(projects.removedAt))
      .all()
      .map(toProjectRecord)
  }

  async add(projectPath: string): Promise<ProjectRecord> {
    const scanned = await scanProjectDirectory(projectPath)
    const database = getDatabase()
    const existing = database
      .select()
      .from(projects)
      .where(eq(projects.path, projectPath))
      .get()
    const now = new Date().toISOString()

    if (existing) {
      database
        .update(projects)
        .set({
          ...scanned,
          updatedAt: now,
          removedAt: null,
        })
        .where(eq(projects.id, existing.id))
        .run()

      return toProjectRecord({
        ...existing,
        ...scanned,
        updatedAt: now,
        removedAt: null,
      })
    }

    const record: typeof projects.$inferInsert = {
      id: randomUUID(),
      ...scanned,
      createdAt: now,
      updatedAt: now,
      removedAt: null,
    }
    database.insert(projects).values(record).run()
    return toProjectRecord(record as typeof projects.$inferSelect)
  }

  async refresh(id: string): Promise<ProjectRecord> {
    const database = getDatabase()
    const existing = database
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.removedAt)))
      .get()

    if (!existing) {
      throw new Error('项目不存在或已被移除。')
    }

    const scanned = await scanProjectDirectory(existing.path)
    const updatedAt = new Date().toISOString()
    database
      .update(projects)
      .set({ ...scanned, updatedAt })
      .where(eq(projects.id, id))
      .run()

    return toProjectRecord({ ...existing, ...scanned, updatedAt })
  }

  remove(id: string): void {
    getDatabase()
      .update(projects)
      .set({ removedAt: new Date().toISOString() })
      .where(eq(projects.id, id))
      .run()
  }

  restore(id: string): ProjectRecord {
    const database = getDatabase()
    database
      .update(projects)
      .set({ removedAt: null, updatedAt: new Date().toISOString() })
      .where(eq(projects.id, id))
      .run()

    const restored = database
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .get()

    if (!restored) {
      throw new Error('无法恢复该项目。')
    }

    return toProjectRecord(restored)
  }

  getPath(id: string): string {
    return this.get(id).path
  }
}
