// The bundled node manager against the real child: record-node's
// dist/cli.js under the Electron binary (child_process with
// ELECTRON_RUN_AS_NODE here; the app's utilityProcess path runs in
// bundled-utility-process.test.ts). Health, a crash and its restart, clean
// shutdown, record-node's data-directory lock and an orphan holding it, a
// stop during every startup step, a double retry, the child's environment,
// and an impostor on the port.

import { afterAll, describe, expect, test } from 'bun:test'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import electron_path from 'electron'

import { spawn_node_process, type ChildHandle, type SpawnChild } from '#main/bundled/child-handle.ts'
import { create_node_log } from '#main/bundled/node-log.ts'
import { choose_port, create_node_manager, MAX_FAILED_RESTARTS, MAX_PORT_RETRIES, restart_delay_ms, YTDLP_DISABLED_PATH } from '#main/bundled/node-manager.ts'
import { CHILD_FILE } from '#main/bundled/node-orphan.ts'
import { PIN_FILE } from '#main/bundled/node-pin.ts'
import { describe_process, is_alive } from '#main/bundled/process-probe.ts'
import type { BundledState } from '#shared/bridge.ts'

const CLI_PATH = fileURLToPath(new URL('../../node_modules/record-node/dist/cli.js', import.meta.url))
// What an orphan's command line must carry: in the app, its bundle; here,
// where children run under child_process, the script itself.
const ORPHAN_MARKER = CLI_PATH
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

const setup = async ({ cli_path = CLI_PATH, data_dir: shared_dir, spawn_child, ...options }: {
  cli_path?: string
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
    orphan_marker: ORPHAN_MARKER,
    log,
    on_state: (state) => { states.push(state) },
    ...options
  })
  managers.push(manager)
  return { manager, states, data_dir, root, log, children: counted.children }
}

describe('bundled node manager', () => {
  test('starts the real node on loopback, pins it, survives a crash, fails beside a node it did not leave, and stops cleanly', async () => {
    const { manager, data_dir, root, log } = await setup()
    await manager.start()
    await wait_for(() => manager.get_state().status === 'running', 'running')
    const { url, pid, node_key_pin } = manager.get_state()
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
    const settings = await (await fetch(`${url}/api/settings`)).json() as { peer_id: string }
    expect(node_key_pin).toMatchObject({ peer_id: settings.peer_id, identity_address: expect.stringMatching(/^\/record\//) })
    expect(JSON.parse(await readFile(join(data_dir, PIN_FILE), 'utf8'))).toEqual(node_key_pin)
    expect(JSON.parse(await readFile(join(data_dir, CHILD_FILE), 'utf8'))).toEqual({ pid, started: (await describe_process(pid as number))?.started })
    expect(JSON.parse(await readFile(join(root, 'bundled-node.json'), 'utf8'))).toMatchObject({ host: '127.0.0.1', cors_origins: [] })
    expect((await fetch(`${url}/api/settings`, { headers: { origin: 'http://localhost:5173' } })).status).toBe(403)
    expect((await readFile(log.path, 'utf8')).length).toBeGreaterThan(0)

    process.kill(pid as number, 'SIGKILL')
    await wait_for(() => manager.get_state().status === 'restarting', 'restarting')
    expect(manager.get_state()).toMatchObject({ failed_restarts: 1, error: expect.stringContaining('SIGKILL') })
    await wait_for(() => manager.get_state().status === 'running', 'running again')
    expect(manager.get_state()).toMatchObject({ url, node_key_pin })
    expect(manager.get_state().pid).not.toBe(pid)
    expect(JSON.parse(await readFile(join(data_dir, CHILD_FILE), 'utf8'))).toMatchObject({ pid: manager.get_state().pid })

    // A second manager's node exits 75 on record-node's lock. The holder is
    // a child of this process, not an orphan, so it is left running.
    const second = await setup({ data_dir })
    await second.manager.start()
    await wait_for(() => second.manager.get_state().status === 'failed', 'the second manager to fail')
    expect(second.manager.get_state().error).toContain('Another record-node is using the data directory')
    expect(is_alive(manager.get_state().pid as number)).toBe(true)
    expect(second.manager.get_state().failed_restarts).toBe(0)

    const running_pid = manager.get_state().pid as number
    const started = Date.now()
    await manager.stop()
    expect(Date.now() - started).toBeLessThan(10_000)
    expect(is_alive(running_pid)).toBe(false)
    expect(manager.get_state().status).toBe('stopped')
    await wait_for(() => !existsSync(join(data_dir, CHILD_FILE)), 'the child record cleared')
  }, 90_000)

  test('a stop during any step of a start leaves no child behind', async () => {
    for (const step of ['port', 'config', 'spawned']) {
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

  test('relocating moves the node to a new data directory, which gets its own node', async () => {
    const { manager, data_dir, root } = await setup()
    await manager.start()
    await wait_for(() => manager.get_state().status === 'running', 'running')
    const old_pin = manager.get_state().node_key_pin
    const old_pid = manager.get_state().pid as number
    const next_dir = join(root, 'moved')
    await mkdir(next_dir)
    await manager.relocate({ next_data_dir: next_dir, start: true })
    await wait_for(() => manager.get_state().status === 'running', 'running in the new directory')
    const moved = manager.get_state()
    expect(moved.data_dir).toBe(next_dir)
    expect(moved.started_at_ms).toBeNumber()
    expect(is_alive(old_pid)).toBe(false)
    expect(JSON.parse(await readFile(join(next_dir, CHILD_FILE), 'utf8'))).toMatchObject({ pid: moved.pid })
    expect(moved.node_key_pin?.identity_address).not.toBe(old_pin?.identity_address)

    // Moving back finds the first node's pin, and with start false leaves it stopped.
    await manager.relocate({ next_data_dir: data_dir, start: false })
    expect(manager.get_state()).toMatchObject({ status: 'stopped', data_dir, node_key_pin: old_pin, pid: null, started_at_ms: null })
  }, 90_000)

  test('two retries at once start one node, and a retry never runs beside a running one', async () => {
    const first = await setup()
    await first.manager.start()
    await wait_for(() => first.manager.get_state().status === 'running', 'first running')
    // A second manager on the same data directory fails on the lock...
    const second = await setup({ data_dir: first.data_dir })
    await second.manager.start()
    await wait_for(() => second.manager.get_state().status === 'failed', 'the second manager to fail')
    // ...and once the lock is free, a double retry spawns exactly one child
    // beyond the one record-node refused.
    expect(second.children).toHaveLength(1)
    await first.manager.stop()
    await Promise.all([second.manager.restart(), second.manager.restart()])
    await wait_for(() => second.manager.get_state().status === 'running', 'second running')
    expect(second.children).toHaveLength(2)
    await second.manager.restart()
    expect(second.children).toHaveLength(2)
    await second.manager.stop()
  }, 90_000)

  test('the child gets an allowlisted environment: no NODE_OPTIONS, no other NODE_* or ELECTRON_* from the app', async () => {
    const { root } = await setup()
    const dump = join(root, 'env.mjs')
    await writeFile(dump, "console.log('ENV ' + JSON.stringify(process.env)); setInterval(() => {}, 1000)\n")
    const { manager, log } = await setup({
      cli_path: dump,
      startup_timeout_ms: 1_500,
      env: { ...process.env, NODE_OPTIONS: '--inspect=9229', NODE_DEBUG: 'net', ELECTRON_ENABLE_LOGGING: '1', RECORD_CONFIG: '/tmp/x.json', YTDLP_PATH: '/tmp/yt-dlp', LC_ALL: 'C', PATH: process.env.PATH ?? '' }
    })
    await manager.start()
    await wait_for(() => manager.get_state().status === 'failed', 'the dump to time out')
    const line = (await readFile(log.path, 'utf8')).split('\n').find((text) => text.includes(' out ENV '))
    const child_env = JSON.parse(line?.slice(line.indexOf('ENV ') + 4) ?? '{}') as Record<string, string>
    expect(child_env.NODE_OPTIONS).toBeUndefined()
    expect(child_env.NODE_DEBUG).toBeUndefined()
    expect(child_env.ELECTRON_ENABLE_LOGGING).toBeUndefined()
    expect(child_env.RECORD_CONFIG).toBeUndefined()
    expect(child_env.YTDLP_PATH).toBeUndefined()
    expect(child_env).toMatchObject({ PATH: process.env.PATH, LC_ALL: 'C' })
    await manager.stop()
  }, 30_000)

  test('the bundled node never runs a yt-dlp, even one on PATH or in YTDLP_PATH', async () => {
    const { root } = await setup()
    const fake_bin = join(root, 'fake-bin')
    const marker = join(root, 'yt-dlp-ran')
    await mkdir(fake_bin)
    await writeFile(join(fake_bin, 'yt-dlp'), `#!/bin/sh\ntouch '${marker}'\necho '{}'\n`, { mode: 0o755 })
    const { manager, root: node_root, log } = await setup({ env: { ...process.env, PATH: `${fake_bin}:${process.env.PATH ?? ''}`, YTDLP_PATH: join(fake_bin, 'yt-dlp') } })
    await manager.start()
    await wait_for(() => manager.get_state().status === 'running', 'running')
    const { url } = manager.get_state()
    expect(JSON.parse(await readFile(join(node_root, 'bundled-node.json'), 'utf8'))).toMatchObject({ ytdlp_path: YTDLP_DISABLED_PATH })
    // A public address literal, so the destination check passes without DNS and only yt-dlp could answer.
    const target = 'https://93.184.215.14/track'
    const resolved = await fetch(`${url}/api/resolve?url=${encodeURIComponent(target)}`)
    await fetch(`${url}/api/import/url`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: target }) })
    await new Promise((resolve) => setTimeout(resolve, 2_000))
    expect({ resolve_ok: resolved.ok, ran: await Bun.file(marker).exists() }).toEqual({ resolve_ok: false, ran: false })
    expect(await readFile(log.path, 'utf8')).not.toContain(fake_bin)
    await manager.stop()
  }, 30_000)

  test('another process answering on the port before our node is never used: the node moves to a fresh port, within a bound', async () => {
    const { manager, data_dir } = await setup()
    await manager.start()
    await wait_for(() => manager.get_state().status === 'running', 'pinned')
    const pinned_peer = manager.get_state().node_key_pin?.peer_id
    await manager.stop()
    const impostor = createServer((request, response) => {
      response.setHeader('content-type', 'application/json')
      response.end(request.url === '/api/settings' ? JSON.stringify({ peer_id: '12D3KooWImpostor' }) : '[]')
    })
    await new Promise<void>((resolve) => { impostor.listen(0, '127.0.0.1', resolve) })
    const port = (impostor.address() as { port: number }).port

    // The impostor holds the remembered port once; the relaunch gets another.
    const states: BundledState[] = []
    let picks = 0
    const again = await setup({
      data_dir,
      pick_port: async (preferred) => (picks++ === 0 ? port : await choose_port(preferred)),
      on_state: (state) => { states.push(state) }
    })
    await again.manager.start()
    await wait_for(() => again.manager.get_state().status === 'running', 'running on a fresh port')
    expect(again.manager.get_state().port).not.toBe(port)
    expect(again.manager.get_state().node_key_pin?.peer_id).toBe(pinned_peer)
    expect(states.some(({ status, port: at }) => status === 'running' && at === port)).toBe(false)
    expect(states.some(({ error }) => error?.includes('Another process answered') === true)).toBe(true)
    await again.manager.stop()

    // An impostor on every port the node is offered: it gives up, never running.
    const stuck_states: BundledState[] = []
    const stuck = await setup({ data_dir, pick_port: async () => port, on_state: (state) => { stuck_states.push(state) } })
    await stuck.manager.start()
    await wait_for(() => stuck.manager.get_state().status === 'failed', 'gave up')
    expect(stuck.manager.get_state().error).toContain(`after ${MAX_PORT_RETRIES} tries`)
    expect(stuck_states.some(({ status }) => status === 'running')).toBe(false)
    impostor.close()
    await stuck.manager.stop()
  }, 90_000)

  test('a node that announced its port but answers as another peer means the data directory changed, and fails', async () => {
    const { manager, data_dir } = await setup()
    await manager.start()
    await wait_for(() => manager.get_state().status === 'running', 'pinned')
    await manager.stop()
    // The pin now names a different peer than the data directory holds.
    await writeFile(join(data_dir, PIN_FILE), JSON.stringify({ peer_id: '12D3KooWSomeoneElse', identity_address: null }))
    const again = await setup({ data_dir })
    await again.manager.start()
    await wait_for(() => again.manager.get_state().status === 'failed', 'refused')
    expect(again.manager.get_state().error).toContain('holds a different node')
    await again.manager.stop()
  }, 60_000)

  test('an orphan of this app holding the data directory is ended, and anything else is left alone', async () => {
    const { manager, data_dir, log } = await setup()
    await mkdir(data_dir, { recursive: true })
    // A node whose parent is gone, as a force quit could leave: started
    // through a shell that exits at once.
    const port = await choose_port(null)
    const shell = spawn('sh', ['-c', 'ELECTRON_RUN_AS_NODE=1 "$0" "$1" --port "$2" --data-dir "$3" >/dev/null 2>&1 & echo $!', electron_path as unknown as string, CLI_PATH, String(port), data_dir], { stdio: ['ignore', 'pipe', 'ignore'] })
    let output = ''
    shell.stdout.on('data', (data: Buffer) => { output += String(data) })
    await new Promise((resolve) => shell.once('exit', resolve))
    const orphan = Number(output.trim())
    try {
      let answering = false
      await wait_for(() => {
        fetch(`http://127.0.0.1:${port}/api/settings`).then(() => { answering = true }).catch(() => {})
        return answering
      }, 'the orphan to come up')
      // Not recorded as this app's child: refused, and left running.
      await manager.start()
      await wait_for(() => manager.get_state().status === 'failed', 'refused beside an unknown holder')
      expect(manager.get_state().error).toContain('not one this app left running')
      expect(is_alive(orphan)).toBe(true)
      // Recorded: ended, and the app's own node takes the directory.
      await writeFile(join(data_dir, CHILD_FILE), JSON.stringify({ pid: orphan, started: (await describe_process(orphan))?.started }))
      await manager.restart()
      await wait_for(() => manager.get_state().status === 'running', 'running after ending the orphan')
      expect(is_alive(orphan)).toBe(false)
      expect(await readFile(log.path, 'utf8')).toContain(`ending an orphaned bundled node (process ${orphan})`)
      await manager.stop()
    } finally {
      try { process.kill(orphan, 'SIGKILL') } catch {}
    }
  }, 90_000)

  // A child that record-node always refuses (exit 75), beside a stand-in
  // holder: a sleep whose shell has exited, so its parent is gone.
  const refused_setup = async (options: Partial<Parameters<typeof setup>[0]> = {}) => {
    const { root } = await setup()
    const refused = join(root, 'refused.mjs')
    await writeFile(refused, 'process.exit(75)\n')
    const shell = spawn('sh', ['-c', 'sleep 60 >/dev/null 2>&1 & echo $!'], { stdio: ['ignore', 'pipe', 'ignore'] })
    let output = ''
    shell.stdout.on('data', (data: Buffer) => { output += String(data) })
    await new Promise((resolve) => shell.once('exit', resolve))
    const holder = Number(output.trim())
    const made = await setup({ cli_path: refused, ...options })
    await mkdir(made.data_dir, { recursive: true })
    const record = async (started?: string) => {
      await writeFile(join(made.data_dir, CHILD_FILE), JSON.stringify({ pid: holder, started: started ?? (await describe_process(holder))?.started }))
    }
    return { ...made, holder, record, end: () => { try { process.kill(holder, 'SIGKILL') } catch {} } }
  }

  test('a recorded PID that is not an orphan of this app is never signalled', async () => {
    // Its command line lacks the app's marker.
    const unmarked = await refused_setup()
    try {
      await unmarked.record()
      await unmarked.manager.start()
      await wait_for(() => unmarked.manager.get_state().status === 'failed', 'refused')
      expect(is_alive(unmarked.holder)).toBe(true)
    } finally { unmarked.end() }
    // The PID now belongs to a process started at another time.
    const reused = await refused_setup({ orphan_marker: 'sleep 60' })
    try {
      await reused.record('Thu Jan  1 00:00:00 1970')
      await reused.manager.start()
      await wait_for(() => reused.manager.get_state().status === 'failed', 'refused')
      expect(is_alive(reused.holder)).toBe(true)
    } finally { reused.end() }
  }, 30_000)

  test('an orphan is ended once per start: a second refusal fails, and a stop during the lookup signals nothing', async () => {
    let stop: (() => Promise<void>) | null = null
    const stopped: Array<Promise<void>> = []
    const interrupted = await refused_setup({ orphan_marker: 'sleep 60', checkpoint: async (at) => { if (at === 'orphan' && stop !== null) stopped.push(stop()) } })
    try {
      stop = interrupted.manager.stop
      await interrupted.record()
      await interrupted.manager.start()
      await wait_for(() => stopped.length === 1, 'the stop during the lookup')
      await Promise.all(stopped)
      expect(interrupted.manager.get_state().status).toBe('stopped')
      expect(is_alive(interrupted.holder)).toBe(true)
    } finally { interrupted.end() }

    const once = await refused_setup({ orphan_marker: 'sleep 60' })
    try {
      await once.record()
      await once.manager.start()
      await wait_for(() => once.manager.get_state().status === 'failed', 'failed after one relaunch')
      expect(is_alive(once.holder)).toBe(false)
      expect(once.children).toHaveLength(2)
      expect(once.manager.get_state().error).toContain('not one this app left running')
    } finally { once.end() }
  }, 30_000)

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

  test('a stop force-kills a child that reports its exit while its OS process still runs', async () => {
    // Electron's utilityProcess can fire 'exit' before the OS child's SIGTERM
    // shutdown finishes (Linux). The manager must then wait and SIGKILL, not
    // declare the stop clean while a process of ours still answers. Drive the
    // same shape with a real process and a handle that reports exit at once.
    const sleeper = spawn('sleep', ['60'], { stdio: 'ignore' })
    const pid = sleeper.pid as number
    const resilient: ChildHandle = {
      stdout: null,
      stderr: null,
      spawned: Promise.resolve(pid),
      exited: Promise.resolve(),
      alive: () => true,
      terminate: () => {},
      kill: () => {},
      on_exit: () => {}
    }
    const { manager } = await setup({
      spawn_child: () => resilient,
      health: async () => null,
      shutdown_timeout_ms: 500
    })
    await manager.start()
    const started = Date.now()
    await manager.stop()
    expect(Date.now() - started).toBeLessThan(5_000)
    await wait_for(() => !is_alive(pid), 'the lingering child is gone', 2_000)
    try { process.kill(pid, 'SIGKILL') } catch {}
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
