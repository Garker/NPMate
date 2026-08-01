import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  InstalledPackage,
  PackageCommandRequest,
  PackageCommandResult,
  ProjectDependencies,
} from '../../src/types/package'
import { commandArgs } from './package-command'
import { commandEnvironment } from './command-environment'
import { ProjectService } from './project.service'
import { HistoryService } from './history.service'

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const packageNamePattern =
  /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i
const versionPattern = /^[a-z0-9*^~<>=|.+\-/]+$/i

function assertPackageInput(name: string, version?: string): void {
  if (!packageNamePattern.test(name)) {
    throw new Error('包名格式无效。')
  }
  if (version && !versionPattern.test(version)) {
    throw new Error('版本格式无效。')
  }
}

function flattenDependencies(
  values: Record<string, string> | undefined,
  kind: InstalledPackage['kind'],
): InstalledPackage[] {
  return Object.entries(values ?? {})
    .map(([name, versionRange]) => ({ name, versionRange, kind }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

/**
 * 包管理命令仅通过参数数组执行，不启用 shell，避免命令注入。
 */
export class PackageManagerService {
  private readonly projects = new ProjectService()
  private readonly history = new HistoryService()

  async list(projectId: string): Promise<ProjectDependencies> {
    const project = this.projects.get(projectId)
    const packageJson = JSON.parse(
      await readFile(join(project.path, 'package.json'), 'utf8'),
    ) as PackageJson

    return {
      projectId,
      packageManager: project.packageManager,
      dependencies: [
        ...flattenDependencies(packageJson.dependencies, 'dependency'),
        ...flattenDependencies(packageJson.devDependencies, 'devDependency'),
      ],
    }
  }

  async execute(request: PackageCommandRequest): Promise<PackageCommandResult> {
    assertPackageInput(request.packageName, request.version)
    const project = this.projects.get(request.projectId)
    if (project.packageManager === 'unknown') {
      throw new Error('未检测到锁文件，无法确定要使用的包管理器。')
    }

    const args = commandArgs(project.packageManager, request)
    const environment = await commandEnvironment()
    const startedAt = new Date().toISOString()
    const result = await new Promise<{
      exitCode: number
      stdout: string
      stderr: string
    }>((resolve, reject) => {
      const child = spawn(project.packageManager, args, {
        cwd: project.path,
        shell: false,
        env: environment,
      })
      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString()
      })
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })
      child.on('error', (error) => reject(error))
      child.on('close', (exitCode) =>
        resolve({ exitCode: exitCode ?? 1, stdout, stderr }),
      )
    })

    const command = [project.packageManager, ...args].join(' ')
    const commandResult: PackageCommandResult = {
      action: request.action,
      command,
      ...result,
      startedAt,
      finishedAt: new Date().toISOString(),
    }

    this.history.record({
      projectId: project.id,
      projectName: project.name,
      action: request.action,
      command,
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      output: result.stdout || result.stderr,
    })

    if (result.exitCode !== 0) {
      throw new Error(result.stderr.trim() || `${command} 执行失败。`)
    }
    await this.projects.refresh(project.id)
    return commandResult
  }
}
