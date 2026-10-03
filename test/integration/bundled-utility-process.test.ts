// The bundled node through Electron's utilityProcess, the app's own spawn
// path, which only exists inside Electron: builds test/electron's harness
// and runs it under the Electron binary. On Linux it needs a display (CI
// runs the suite under xvfb-run).

import { describe, expect, test } from 'bun:test'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import electron_path from 'electron'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const CLI_PATH = join(ROOT, 'node_modules', 'record-node', 'dist', 'cli.js')

describe('bundled node through utilityProcess', () => {
  test('starts healthy and pinned, keeps NODE_OPTIONS out, restarts after a crash, stops cleanly, and a stop during any start step leaves no child', async () => {
    const out = await mkdtemp(join(tmpdir(), 'record-app-harness-'))
    try {
      const harness = join(out, 'harness.mjs')
      execFileSync('bun', ['build', join(ROOT, 'test/electron/utility-process-harness.ts'), '--target=node', '--format=esm', '--external', 'electron', '--outfile', harness], { cwd: ROOT, stdio: 'pipe' })
      const args = [...(process.platform === 'linux' ? ['--no-sandbox'] : []), harness, CLI_PATH]
      const run = spawnSync(electron_path as unknown as string, args, { cwd: ROOT, encoding: 'utf8', timeout: 120_000, env: { ...process.env, ELECTRON_ENABLE_LOGGING: '' } })
      const line = run.stdout.split('\n').find((text) => text.startsWith('HARNESS '))
      if (line === undefined) throw new Error(`no harness output (exit ${run.status}):\n${run.stdout}\n${run.stderr}`)
      const { results, failures } = JSON.parse(line.slice('HARNESS '.length)) as { results: Record<string, unknown>, failures: string[] }
      console.log('utilityProcess harness:', JSON.stringify(results))
      expect(failures).toEqual([])
      expect(run.status).toBe(0)
    } finally {
      await rm(out, { recursive: true, force: true })
    }
  }, 180_000)
})
