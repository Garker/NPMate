import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { commandArgs } from '../electron/services/package-command'
import { detectPackageManager } from '../electron/services/package-manager-detection'

describe('Bun project support', () => {
  test('detects bun.lock as a Bun-managed project', async () => {
    const projectPath = await mkdtemp(join(tmpdir(), 'npmate-bun-'))
    try {
      await writeFile(join(projectPath, 'bun.lock'), '')
      expect(await detectPackageManager(projectPath)).toEqual({
        packageManager: 'bun',
        lockFile: 'bun.lock',
      })
    } finally {
      await rm(projectPath, { recursive: true, force: true })
    }
  })

  test('uses Bun-native package command arguments', () => {
    expect(
      commandArgs('bun', {
        projectId: 'project',
        action: 'install',
        packageName: 'react',
        dev: true,
      }),
    ).toEqual(['add', 'react', '--dev'])
    expect(
      commandArgs('bun', {
        projectId: 'project',
        action: 'upgrade',
        packageName: 'react',
      }),
    ).toEqual(['update', 'react'])
    expect(
      commandArgs('bun', {
        projectId: 'project',
        action: 'uninstall',
        packageName: 'react',
      }),
    ).toEqual(['remove', 'react'])
  })
})
