import { spawn } from 'node:child_process'
import { commandEnvironment } from './command-environment'

export interface NpmTreeNode {
  name?: string
  version?: string
  dependencies?: Record<string, NpmTreeNode>
}

export async function runNpmTree(cwd: string): Promise<NpmTreeNode> {
  const environment = await commandEnvironment()
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['ls', '--all', '--json'], {
      cwd,
      shell: false,
      env: environment,
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
