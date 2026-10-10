import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Glob } from 'bun'

const ROOT = join(import.meta.dir, '../..')

// A script that drives the app starts it through test/e2e/launch.ts, hidden
// in background mode, and captures through it, so a run never shows the
// operator a window, takes their focus, or makes a sound. The packaged
// smoke spawns a test build itself and sets the mode on each launch line.
test('every end-to-end script launches and captures the app through launch.ts', async () => {
  const offenders: string[] = []
  let scanned = 0
  for await (const path of new Glob('test/e2e/**/*.ts').scan(ROOT)) {
    if (path === join('test', 'e2e', 'launch.ts')) continue
    scanned += 1
    const source = await readFile(join(ROOT, path), 'utf8')
    if (/\b_electron\b|electron\.launch\(/.test(source)) offenders.push(`${path}: launches Electron directly`)
    // Playwright's screenshot hangs on a window behind the operator's.
    if (/\.screenshot\(/.test(source)) offenders.push(`${path}: takes a Playwright screenshot, not capture()`)
    source.split('\n').forEach((line, index) => {
      if (/\b(spawn|spawnSync|execFile|execFileSync|exec|execSync)\(/.test(line) && line.includes('--user-data-dir') && !line.includes("RECORD_BACKGROUND: 'hidden'")) {
        offenders.push(`${path}:${index + 1}: launches the app without RECORD_BACKGROUND`)
      }
    })
  }
  expect(scanned).toBeGreaterThan(5)
  expect(offenders).toEqual([])
})
