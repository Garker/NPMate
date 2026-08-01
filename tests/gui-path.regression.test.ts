import { afterEach, describe, expect, test } from 'bun:test'
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runNpmTree } from '../electron/services/npm-tree'
import { EnvironmentService } from '../electron/services/environment.service'

const originalPath = process.env.PATH
const originalShell = process.env.SHELL
const originalTestPath = process.env.NPMATE_TEST_PATH
const temporaryDirectories: string[] = []

afterEach(async () => {
  process.env.PATH = originalPath
  process.env.SHELL = originalShell
  if (originalTestPath === undefined) delete process.env.NPMATE_TEST_PATH
  else process.env.NPMATE_TEST_PATH = originalTestPath
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

describe('desktop command PATH recovery', () => {
  test('detects npm and runs dependency analysis with a GUI-style PATH', async () => {
    const root = await mkdtemp(join(tmpdir(), 'npmate-gui-path-'))
    temporaryDirectories.push(root)
    const toolsDirectory = join(root, 'tools')
    const shellPath = join(root, 'login-shell')
    const npmPath = join(toolsDirectory, 'npm')

    await mkdir(toolsDirectory)
    await writeFile(
      shellPath,
      [
        '#!/bin/sh',
        'shift',
        'command_to_run="$1"',
        'PATH="$NPMATE_TEST_PATH:/usr/bin:/bin" exec /bin/sh -c "$command_to_run"',
        '',
      ].join('\n'),
    )
    await writeFile(
      npmPath,
      [
        '#!/bin/sh',
        'if [ "$1" = "ls" ]; then',
        '  printf \'{"name":"fixture","version":"1.0.0","dependencies":{}}\'',
        'elif [ "$1" = "config" ]; then',
        '  printf "https://registry.npmjs.org/"',
        'else',
        '  printf "10.0.0"',
        'fi',
        '',
      ].join('\n'),
    )
    await Promise.all([chmod(shellPath, 0o755), chmod(npmPath, 0o755)])

    process.env.PATH = '/usr/bin:/bin'
    process.env.SHELL = shellPath
    process.env.NPMATE_TEST_PATH = toolsDirectory

    const environment = await new EnvironmentService().inspect()
    const tree = await runNpmTree(root)

    expect(environment.tools.find((tool) => tool.name === 'npm')?.version).toBe(
      '10.0.0',
    )
    expect(tree).toEqual({
      name: 'fixture',
      version: '1.0.0',
      dependencies: {},
    })
  })
})
