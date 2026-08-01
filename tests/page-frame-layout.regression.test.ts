import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

test('page header stacks its actions before the title is crushed', async () => {
  const stylesheet = await readFile(
    join(import.meta.dir, '../src/components/PageFrame/styles.css'),
    'utf8',
  )

  expect(stylesheet).toContain('container-type: inline-size')
  expect(stylesheet).toMatch(
    /@container[^{]*\(max-width:[^)]+\)[\s\S]*?\.page-header\s*\{[\s\S]*?flex-direction:\s*column/,
  )
})
