import { spawn } from 'node:child_process'
import type { EnvironmentInfo } from '../../src/types/system'
import { commandEnvironment } from './command-environment'

function run(
  command: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { shell: false, env: environment })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.on('error', () => resolve(null))
    child.on('close', (code) => resolve(code === 0 ? output.trim() : null))
  })
}

function assertRegistry(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Registry URL 格式无效。')
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error('Registry 仅支持 HTTP 或 HTTPS。')
  }
  return parsed.toString()
}

export class EnvironmentService {
  async inspect(): Promise<EnvironmentInfo> {
    const environment = await commandEnvironment({ refresh: true })
    const [node, npm, pnpm, yarn, bun, volta, registry] = await Promise.all([
      run('node', ['--version'], environment),
      run('npm', ['--version'], environment),
      run('pnpm', ['--version'], environment),
      run('yarn', ['--version'], environment),
      run('bun', ['--version'], environment),
      run('volta', ['--version'], environment),
      run('npm', ['config', 'get', 'registry'], environment),
    ])
    return {
      tools: [
        { name: 'node', version: node },
        { name: 'npm', version: npm },
        { name: 'pnpm', version: pnpm },
        { name: 'yarn', version: yarn },
        { name: 'bun', version: bun },
      ],
      managers: {
        nvm: Boolean(environment.NVM_DIR),
        fnm: Boolean(environment.FNM_DIR || environment.FNM_MULTISHELL_PATH),
        volta: Boolean(environment.VOLTA_HOME || volta),
      },
      registry: registry ?? 'https://registry.npmjs.org/',
    }
  }

  async setRegistry(url: string): Promise<EnvironmentInfo> {
    const value = assertRegistry(url)
    const environment = await commandEnvironment({ refresh: true })
    const commands: Array<[string, string[]]> = [
      ['npm', ['config', 'set', 'registry', value]],
      ['pnpm', ['config', 'set', 'registry', value]],
      ['yarn', ['config', 'set', 'registry', value]],
    ]
    let changed = false
    for (const [command, args] of commands) {
      const result = await run(command, args, environment)
      if (result !== null) changed = true
    }
    if (!changed) throw new Error('没有可用的包管理器可以更新 Registry。')
    return this.inspect()
  }
}
