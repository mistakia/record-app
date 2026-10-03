// The bundled node manager against the real child: record-node's
// dist/cli.js under the Electron binary (child_process with
// ELECTRON_RUN_AS_NODE here; the app's utilityProcess path runs in
// bundled-utility-process.test.ts). Health, a crash and its restart, clean
// shutdown, the data-directory lock, a stop during every startup step, a
// double retry, the child's environment, and an impostor on the port.

import { afterAll, describe, expect, test } from 'bun:test'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import electron_path from 'electron'

import { spawn_node_process, type ChildHandle, type SpawnChild } from '#main/bundled/child-handle.ts'
import { create_node_lock, LOCK_FILE } from '#main/bundled/node-lock.ts'
import { create_node_log } from '#main/bundled/node-log.ts'
import { create_node_manager, MAX_FAILED_RESTARTS, restart_delay_ms } from '#main/bundled/node-manager.ts'
import { PIN_FILE } from '#main/bundled/node-pin.ts'
import { is_alive, os_process_probe } from '#main/bundled/process-probe.ts'
import type { BundledState } from '#shared/bridge.ts'

const CLI_PATH = fileURLToPath(new URL('../../node_modules/record-node/dist/cli.js', import.meta.url))
const NODE_MARKER = 'record-node/dist/cli.js'
// The app marker the lock checks a live owner's command line for: in the
// app, its executable path; here, this test process's own command.
const APP_MARKER = ((await os_process_probe.command_of(process.pid)) ?? process.execPath).split(' ')[0] as string
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

// Every child spawned, so a test can check none outlived a stop.
const counting_spawn = () => {
  const children: ChildHandle[] = []
  const spawn_child: SpawnChild = (input) => {
    const child = spawn_node_process({ node_path: electron_path as unknown as string })(input)
    children.push(child)
    return child
  }
  return { children, spawn_child }
}

const setup = async ({ cli_path = CLI_PATH, owner = 'test-owner', data_dir: shared_dir, spawn_child, ...options }: {
  cli_path?: string
  owner?: string
  data_dir?: string
  spawn_child?: SpawnChild
} & Partial<Parameters<typeof create_node_manager>[0]> = {}) => {
  const root = await mkdtemp(join(tmpdir(), 'record-app-bundled-'))
  directories.push(root)
  const data_dir = shared_dir ?? join(root, 'node-data')
  const states: BundledState[] = []
  const log = create_node_log({ log_dir: join(root, 'logs') })
  const counted = counting_spawn()
  const manager = create_node_manager({
    spawn_child: spawn_child ?? counted.spawn_child,
    cli_path,
    data_dir,
    config_path: join(root, 'bundled-node.json'),
    version: 'test',
    env: process.env,
    lock: create_node_lock({ data_dir, app_pid: process.pid, owner, probe: os_process_probe, node_marker: NODE_MARKER, app_marker: APP_MARKER }),
    log,
    on_state: (state) => { states.push(state) },
    ...options
  })
  managers.push(manager)
  return { manager, states, data_dir, root, log, children: counted.children }
}

describe('bundled node manager', () => {
  test('starts the real node on loopback, pins it, survives a crash, refuses a second owner, and stops cleanly', async () => {
    const { manager, data_dir, root, log } = await setup()
    await manager.start()
    await wait_for(() => manager.get_state().status === 'running', 'running')
    const { url, pid, node_key_pin } = manager.get_state()
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
    const settings = await (await fetch(`${url}/api/settings`)).json() as { peer_id: string }
    expect(node_key_pin).toMatchObject({ peer_id: settings.peer_id, own_library_address: expect.stringMatching(/^\/record\//) })
    expect(JSON.parse(await readFile(join(data_dir, PIN_FILE), 'utf8'))).toEqual(node_key_pin)
    expect(JSON.parse(await readFile(join(data_dir, LOCK_FILE), 'utf8'))).toMatchObject({ app_pid: process.pid, child_pid: pid })
    expect(JSON.parse(await readFile(join(root, 'bundled-node.json'), 'utf8'))).toMatchObject({ host: '127.0.0.1', cors_origins: [] })
    expect((await fetch(`${url}/api/settings`, { headers: { origin: 'http://localhost:5173' } })).status).toBe(403)
    expect((await readFile(log.path, 'utf8')).length).toBeGreaterThan(0)

    process.kill(pid as number, 'SIGKILL')
    await wait_for(() => manager.get_state().status === 'restarting', 'restarting')
    expect(manager.get_state()).toMatchObject({ failed_restarts: 1, error: expect.stringContaining('SIGKILL') })
    await wait_for(() => manager.get_state().status === 'running', 'running again')
    expect(manager.get_state()).toMatchObject({ url, node_key_pin })
    expect(manager.get_state().pid).not.toBe(pid)

    const second = await setup({ owner: 'second-owner', data_dir })
    await second.manager.start()
    expect(second.manager.get_state()).toMatchObject({ status: 'failed', error: expect.stringContaining('in use') })

    const running_pid = manager.get_state().pid as number
    const started = Date.now()
    await manager.stop()
    expect(Date.now() - started).toBeLessThan(10_000)
    expect(is_alive(running_pid)).toBe(false)
    expect(manager.get_state().status).toBe('stopped')
    expect(await Bun.file(join(data_dir, LOCK_FILE)).exists()).toBe(false)
  }, 90_000)

  test('a stop during any step of a start leaves no child behind', async () => {
    for (const step of ['lock', 'port', 'config', 'spawned', 'locked']) {
      let stop: (() => Promise<void>) | null = null
      const stopped: Array<Promise<void>> = []
      const { manager, children } = await setup({
        checkpoint: async (at) => { if (at === step && stop !== null) stopped.push(stop()) }
      })
      stop = manager.stop
      await manager.start()
      await Promise.all(stopped)
      await Promise.all(children.map(async (child) => { await child.exited }))
      expect({ step, alive: children.filter((child) => child.alive()).length, status: manager.get_state().status }).toEqual({ step, alive: 0, status: 'stopped' })
    }
  }, 60_000)

  test('two retries at once start one node, and a retry never runs beside a running one', async () => {
    const first = await setup()
    await first.manager.start()
    await wait_for(() => first.manager.get_state().status === 'running', 'first running')
    // A second manager on the same data directory fails on the lock...
    const second = await setup({ owner: 'second-owner', data_dir: first.data_dir })
    await second.manager.start()
    expect(second.manager.get_state().status).toBe('failed')
    // ...and once the lock is free, a double retry spawns exactly one child.
    await first.manager.stop()
    await Promise.all([second.manager.restart(), second.manager.restart()])
    await wait_for(() => second.manager.get_state().status === 'running', 'second running')
    expect(second.children).toHaveLength(1)
    await second.manager.restart()
    expect(second.children).toHaveLength(1)
    await second.manager.stop()
  }, 90_000)

  test('the child gets an allowlisted environment: no NODE_OPTIONS, no other NODE_* or ELECTRON_* from the app', async () => {
    const { root } = await setup()
    const dump = join(root, 'env.mjs')
    await writeFile(dump, "console.log('ENV ' + JSON.stringify(process.env)); setInterval(() => {}, 1000)\n")
    const { manager, log } = await setup({
      cli_path: dump,
      startup_timeout_ms: 1_500,
      env: { ...process.env, NODE_OPTIONS: '--inspect=9229', NODE_DEBUG: 'net', ELECTRON_ENABLE_LOGGING: '1', RECORD_CONFIG: '/tmp/x.json', LC_ALL: 'C', PATH: process.env.PATH ?? '' }
    })
    await manager.start()
    await wait_for(() => manager.get_state().status === 'failed', 'the dump to time out')
    const line = (await readFile(log.path, 'utf8')).split('\n').find((text) => text.includes(' out ENV '))
    const child_env = JSON.parse(line?.slice(line.indexOf('ENV ') + 4) ?? '{}') as Record<string, string>
    expect(child_env.NODE_OPTIONS).toBeUndefined()
    expect(child_env.NODE_DEBUG).toBeUndefined()
    expect(child_env.ELECTRON_ENABLE_LOGGING).toBeUndefined()
    expect(child_env.RECORD_CONFIG).toBeUndefined()
    expect(child_env).toMatchObject({ PATH: process.env.PATH, LC_ALL: 'C' })
    await manager.stop()
  }, 30_000)

  test('another process answering on the port with a different peer_id is refused, and never marked running', async () => {
    const { manager, data_dir } = await setup()
    await manager.start()
    await wait_for(() => manager.get_state().status === 'running', 'pinned')
    await manager.stop()
    const impostor = createServer((request, response) => {
      response.setHeader('content-type', 'application/json')
      response.end(request.url === '/api/settings' ? JSON.stringify({ peer_id: '12D3KooWImpostor' }) : '[]')
    })
    await new Promise<void>((resolve) => { impostor.listen(0, '127.0.0.1', resolve) })
    const port = (impostor.address() as { port: number }).port
    const states: BundledState[] = []
    const again = await setup({ data_dir, owner: 'again', pick_port: async () => port, on_state: (state) => { states.push(state) } })
    await again.manager.start()
    await wait_for(() => again.manager.get_state().status === 'failed', 'refused')
    expect(again.manager.get_state().error).toContain('Another node answered')
    expect(states.some(({ status }) => status === 'running')).toBe(false)
    impostor.close()
    await again.manager.stop()
  }, 60_000)

  test('a stale lock is cleaned up, an orphaned node is stopped first, and a PID now used by another program is not trusted', async () => {
    const { manager, data_dir, root } = await setup()
    await mkdir(data_dir, { recursive: true })
    await writeFile(join(root, 'orphan.json'), JSON.stringify({ host: '127.0.0.1', port: 0, cors_origins: [] }))
    const orphan = spawn(electron_path as unknown as string, [CLI_PATH, '--port', '0', '--data-dir', data_dir, '--config', join(root, 'orphan.json')], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: 'ignore'
    })
    // The lock's app PID is alive but is not the app: a reused PID.
    const stranger = spawn('sleep', ['30'], { stdio: 'ignore' })
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    await writeFile(join(data_dir, LOCK_FILE), JSON.stringify({ app_pid: stranger.pid, owner: 'gone', child_pid: orphan.pid }))
    await manager.start()
    await wait_for(() => manager.get_state().status === 'running', 'running')
    expect(is_alive(orphan.pid as number)).toBe(false)
    stranger.kill()
    await manager.stop()
  }, 60_000)

  test('two acquirers racing past a stale lock: exactly one wins', async () => {
    const root = await mkdtemp(join(tmpdir(), 'record-app-lock-race-'))
    directories.push(root)
    await writeFile(join(root, LOCK_FILE), JSON.stringify({ app_pid: 2147480000, owner: 'gone', child_pid: null }))
    const lock = (owner: string) => create_node_lock({ data_dir: root, app_pid: process.pid, owner, probe: os_process_probe, node_marker: NODE_MARKER, app_marker: APP_MARKER })
    const results = await Promise.all([lock('a').acquire(), lock('b').acquire()])
    expect(results.filter(({ ok }) => ok)).toHaveLength(1)
  })

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
