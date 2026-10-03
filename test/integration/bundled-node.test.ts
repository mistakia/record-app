// The bundled node manager against the real child: record-node's
// dist/cli.js under the Electron binary with ELECTRON_RUN_AS_NODE, as the
// app runs it. Health, a crash and its restart, clean shutdown, the
// data-directory lock refusing a second owner, a stale lock and its orphan,
// a start that never answers, and giving up after five failed restarts.

import { afterAll, describe, expect, test } from 'bun:test'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import electron_path from 'electron'

import { create_node_lock, LOCK_FILE } from '#main/bundled/node-lock.ts'
import { create_node_log } from '#main/bundled/node-log.ts'
import { create_node_manager, MAX_FAILED_RESTARTS, restart_delay_ms } from '#main/bundled/node-manager.ts'
import { is_alive, os_process_probe } from '#main/bundled/process-probe.ts'
import type { BundledState } from '#shared/bridge.ts'

const CLI_PATH = fileURLToPath(new URL('../../node_modules/record-node/dist/cli.js', import.meta.url))
const NODE_MARKER = 'record-node/dist/cli.js'
const directories: string[] = []
const managers: Array<ReturnType<typeof create_node_manager>> = []

afterAll(async () => {
  for (const manager of managers) await manager.stop()
  for (const directory of directories) await rm(directory, { recursive: true, force: true })
})

const wait_for = async (condition: () => boolean, label: string, timeout_ms = 30_000): Promise<void> => {
  const deadline = Date.now() + timeout_ms
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`)
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

const setup = async ({ cli_path = CLI_PATH, owner = 'test-owner', data_dir: shared_dir, ...options }: {
  cli_path?: string
  owner?: string
  data_dir?: string
} & Partial<Parameters<typeof create_node_manager>[0]> = {}) => {
  const root = await mkdtemp(join(tmpdir(), 'record-app-bundled-'))
  directories.push(root)
  const data_dir = shared_dir ?? join(root, 'node-data')
  const states: BundledState[] = []
  const log = create_node_log({ log_dir: join(root, 'logs') })
  const manager = create_node_manager({
    node_path: electron_path as unknown as string,
    cli_path,
    data_dir,
    config_path: join(root, 'bundled-node.json'),
    version: 'test',
    env: process.env,
    lock: create_node_lock({ data_dir, app_pid: process.pid, owner, probe: os_process_probe, node_marker: NODE_MARKER }),
    log,
    on_state: (state) => { states.push(state) },
    ...options
  })
  managers.push(manager)
  return { manager, states, data_dir, root, log }
}

describe('bundled node manager', () => {
  test('starts the real node on loopback, healthy, with its lock and log', async () => {
    const { manager, data_dir, root, log } = await setup()
    await manager.start()
    await wait_for(() => manager.get_state().status === 'running', 'running')
    const { url, pid } = manager.get_state()
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
    const settings = await (await fetch(`${url}/api/settings`)).json() as { peer_id: string }
    expect(settings.peer_id).toBeString()
    expect(JSON.parse(await readFile(join(data_dir, LOCK_FILE), 'utf8'))).toMatchObject({ app_pid: process.pid, child_pid: pid })
    expect(JSON.parse(await readFile(join(root, 'bundled-node.json'), 'utf8'))).toMatchObject({ host: '127.0.0.1', cors_origins: [] })
    // An Origin is refused: the bundled node admits no browser page.
    expect((await fetch(`${url}/api/settings`, { headers: { origin: 'http://localhost:5173' } })).status).toBe(403)
    await wait_for(() => manager.get_state().ingest_disabled !== null || Date.now() < 0, 'ingest check', 5_000).catch(() => {})
    console.log('ingest on the bundled node:', manager.get_state().ingest_disabled ?? 'enabled (pinned toolchain present)')
    expect((await readFile(log.path, 'utf8')).length).toBeGreaterThan(0)

    // A crash restarts at once, on the same port.
    process.kill(pid as number, 'SIGKILL')
    await wait_for(() => manager.get_state().status === 'restarting', 'restarting')
    expect(manager.get_state()).toMatchObject({ failed_restarts: 1, error: expect.stringContaining('SIGKILL') })
    await wait_for(() => manager.get_state().status === 'running', 'running again')
    expect(manager.get_state().pid).not.toBe(pid)
    expect(manager.get_state().url).toBe(url)

    // A second owner of the same data directory is refused while this one runs.
    const second = await setup({ owner: 'second-owner', data_dir })
    await second.manager.start()
    expect(second.manager.get_state()).toMatchObject({ status: 'failed', error: expect.stringContaining('in use') })

    // Clean shutdown: SIGTERM, a clean exit, and the lock released.
    const running_pid = manager.get_state().pid as number
    const started = Date.now()
    await manager.stop()
    expect(Date.now() - started).toBeLessThan(10_000)
    expect(is_alive(running_pid)).toBe(false)
    expect(manager.get_state().status).toBe('stopped')
    expect(await Bun.file(join(data_dir, LOCK_FILE)).exists()).toBe(false)
  }, 90_000)

  test('a stale lock is cleaned up and an orphaned node from a force quit is stopped first', async () => {
    const { manager, data_dir, root } = await setup()
    await mkdir(data_dir, { recursive: true })
    await writeFile(join(root, 'orphan.json'), JSON.stringify({ host: '127.0.0.1', port: 0, cors_origins: [] }))
    const orphan = spawn(electron_path as unknown as string, [CLI_PATH, '--port', '0', '--data-dir', data_dir, '--config', join(root, 'orphan.json')], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: 'ignore'
    })
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    // The app that owned it is gone (a PID that is not running).
    await writeFile(join(data_dir, LOCK_FILE), JSON.stringify({ app_pid: 2147480000, owner: 'gone', child_pid: orphan.pid }))
    await manager.start()
    await wait_for(() => manager.get_state().status === 'running', 'running')
    expect(is_alive(orphan.pid as number)).toBe(false)
    await manager.stop()
  }, 60_000)

  test('a node that never answers fails with its stderr tail', async () => {
    const { root } = await setup()
    const silent = join(root, 'silent.mjs')
    await writeFile(silent, "console.error('cannot open the database'); setInterval(() => {}, 1000)\n")
    const { manager } = await setup({ cli_path: silent, startup_timeout_ms: 1_000 })
    await manager.start()
    await wait_for(() => manager.get_state().status === 'failed', 'failed')
    expect(manager.get_state()).toMatchObject({ error: expect.stringContaining('did not answer'), stderr_tail: expect.stringContaining('cannot open the database') })
    await manager.stop()
  }, 30_000)

  test('stops restarting after five failed restarts in a row', async () => {
    const { root } = await setup()
    const crashing = join(root, 'crash.mjs')
    await writeFile(crashing, "console.error('boom'); process.exit(3)\n")
    const { manager, states } = await setup({ cli_path: crashing, delay_for: () => 10 })
    await manager.start()
    await wait_for(() => manager.get_state().status === 'failed', 'failed')
    expect([...new Set(states.filter(({ status }) => status === 'restarting').map(({ failed_restarts }) => failed_restarts))]).toEqual([1, 2, 3, 4, 5])
    expect(manager.get_state().error).toContain(`after ${MAX_FAILED_RESTARTS} restarts`)
    expect(manager.get_state().stderr_tail).toContain('boom')
    await manager.stop()
  }, 30_000)

  test('the restart backoff is immediate, then 1, 2, 4, 8 s, capped at 30 s', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 9].map(restart_delay_ms)).toEqual([0, 1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000])
  })
})
