import { spawn } from 'node:child_process'
import { delimiter } from 'node:path'

const inheritedKeys = [
  'NVM_DIR',
  'FNM_DIR',
  'FNM_MULTISHELL_PATH',
  'VOLTA_HOME',
  'PNPM_HOME',
] as const

interface CachedEnvironment {
  key: string
  environment: NodeJS.ProcessEnv
}

let cachedEnvironment: CachedEnvironment | null = null

function environmentKey(): string {
  return [
    process.platform,
    process.env.SHELL ?? '',
    process.env.PATH ?? '',
  ].join('\0')
}

function mergePath(...values: Array<string | undefined>): string {
  return [
    ...new Set(
      values.flatMap((value) => value?.split(delimiter) ?? []).filter(Boolean),
    ),
  ].join(delimiter)
}

function parseEnvironment(output: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {}
  for (const line of output.split(/\r?\n/)) {
    const separator = line.indexOf('=')
    if (separator <= 0) continue
    environment[line.slice(0, separator)] = line.slice(separator + 1)
  }
  return environment
}

function loginShellEnvironment(): Promise<NodeJS.ProcessEnv | null> {
  if (process.platform === 'win32') return Promise.resolve(null)

  const shell =
    process.env.SHELL ||
    (process.platform === 'darwin' ? '/bin/zsh' : '/bin/sh')

  return new Promise((resolve) => {
    const child = spawn(shell, ['-ilc', 'env; exit'], {
      env: process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5_000,
      windowsHide: true,
    })
    let stdout = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.on('error', () => resolve(null))
    child.on('close', () => {
      const environment = parseEnvironment(stdout)
      resolve(environment.PATH ? environment : null)
    })
  })
}

/**
 * Desktop apps launched outside a terminal do not inherit version-manager PATH
 * entries. Recover them from the user's login shell without mutating process.env.
 */
export async function commandEnvironment(options?: {
  refresh?: boolean
}): Promise<NodeJS.ProcessEnv> {
  const key = environmentKey()
  if (!options?.refresh && cachedEnvironment?.key === key) {
    return { ...cachedEnvironment.environment }
  }

  const shellEnvironment = await loginShellEnvironment()
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: mergePath(shellEnvironment?.PATH, process.env.PATH),
  }
  for (const name of inheritedKeys) {
    if (shellEnvironment?.[name]) environment[name] = shellEnvironment[name]
  }

  cachedEnvironment = { key, environment }
  return { ...environment }
}
