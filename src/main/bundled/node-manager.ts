// The bundled node (spec §8.4): spawned as a child through an adapter
// (Electron's utilityProcess in the app), on a loopback port with a data
// directory under userData; health-checked every 250 ms until it answers or
// 30 s pass; restarted after a crash with backoff (at once, then 1, 2, 4,
// 8 s, up to 30 s) until five restarts in a row fail; and stopped with
// SIGTERM, then SIGKILL after 10 s. Start, stop, and restart run one at a
// time, and a stop bumps a generation that an unfinished start checks after
// every await, so no child outlives a stop. record-node locks its data
// directory itself (§8.4.6); a child refused on that lock (exit 75) is
// relaunched once after ending an orphan of this app (§8.4.5), and
// otherwise fails. Imports nothing from Electron.

import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'

import type { BundledState, NetworkPrivacy } from '#shared/bridge.ts'
import { MAX_FAILED_RESTARTS } from '#shared/bundled.ts'
import { build_child_env } from './child-env.ts'
import type { ChildHandle, SpawnChild } from './child-handle.ts'
import { is_alive } from './process-probe.ts'
import type { create_node_log } from './node-log.ts'
import { clear_child, EXIT_DATA_DIR_LOCKED, find_orphan, record_child } from './node-orphan.ts'
import { read_pin, write_pin, type NodePin } from './node-pin.ts'

const RESTART_DELAYS_MS = [0, 1_000, 2_000, 4_000, 8_000]
const RESTART_MAX_DELAY_MS = 30_000
const INGEST_DISABLED = /ingest disabled: (.*)/
const LISTENING = /listening on http:\/\/127\.0\.0\.1:(\d+)\//
// Launches on a fresh port after another process held the chosen one.
// The bundled node ships no yt-dlp, so URL import and resolve stay off: this
// path cannot exist (/dev/null is a file), so record-resolver never falls back
// to a yt-dlp on PATH or in YTDLP_PATH.
export const YTDLP_DISABLED_PATH = '/dev/null/yt-dlp-disabled'

export const MAX_PORT_RETRIES = 3

export { MAX_FAILED_RESTARTS }

export const restart_delay_ms = (attempt: number): number =>
  RESTART_DELAYS_MS[attempt] ?? Math.min(RESTART_MAX_DELAY_MS, 8_000 * 2 ** (attempt - RESTART_DELAYS_MS.length + 1))

// The preferred port when it is free on loopback, otherwise one the OS picks.
export const choose_port = async (preferred: number | null): Promise<number> => {
  const try_listen = async (port: number): Promise<number | null> => await new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => { resolve(null) })
    server.listen(port, '127.0.0.1', () => {
      const address = server.address()
      const chosen = typeof address === 'object' && address !== null ? address.port : null
      server.close(() => { resolve(chosen) })
    })
  })
  return (preferred === null ? null : await try_listen(preferred)) ?? await try_listen(0) ?? 0
}

export interface Health { peer_id: string, identity_address: string | null }

// The node's network (spec §8.3.5, §8.4.2): the privacy, and the record-node
// `network` config that carries it, absent for public, the node's default.
export interface BundledNetwork {
  privacy: NetworkPrivacy
  config?: { mode: 'masked', tor: { socks_address: string } }
}

// GET /api/settings for the peer_id, and GET /api/identity for the
// identity's default own library.
export const probe_health = async (url: string): Promise<Health | null> => {
  try {
    const settings = await (await fetch(`${url}/api/settings`, { signal: AbortSignal.timeout(1_000) })).json() as { peer_id?: unknown }
    if (typeof settings.peer_id !== 'string') return null
    const identity = await (await fetch(`${url}/api/identity`, { signal: AbortSignal.timeout(2_000) })).json() as { meta_log_address?: unknown }
    const address = identity.meta_log_address
    return { peer_id: settings.peer_id, identity_address: typeof address === 'string' && address !== '' ? address : null }
  } catch {
    return null
  }
}

export const create_node_manager = ({
  spawn_child, cli_path, data_dir: initial_data_dir, config_path, version, env, toolchain = null, orphan_marker, log, on_state,
  network = async () => ({ privacy: 'public' }),
  preferred_port = async () => null,
  pick_port = choose_port,
  health = probe_health,
  delay_for = restart_delay_ms,
  checkpoint = async () => {},
  health_interval_ms = 250,
  startup_timeout_ms = 30_000,
  shutdown_timeout_ms = 10_000,
  stable_after_ms = 60_000
}: {
  spawn_child: SpawnChild
  cli_path: string
  data_dir: string
  config_path: string
  // The bundled ffmpeg and fpcalc; null leaves record-node to find them on PATH.
  toolchain?: { ffmpeg_path: string, fpcalc_path: string } | null
  version: string
  env: NodeJS.ProcessEnv
  // Text in the command line of a child this app spawned (node-orphan.ts).
  orphan_marker: string
  log: ReturnType<typeof create_node_log>
  on_state: (state: BundledState) => void
  // Called at each launch; for masked it starts Tor and resolves once Tor's
  // SOCKS port is ready, so the node never starts dialing directly.
  network?: () => Promise<BundledNetwork>
  preferred_port?: () => Promise<number | null>
  pick_port?: (preferred: number | null) => Promise<number>
  health?: (url: string) => Promise<Health | null>
  delay_for?: (attempt: number) => number
  // Called between the steps of a start; tests stop the manager here.
  checkpoint?: (step: string) => Promise<void>
  health_interval_ms?: number
  startup_timeout_ms?: number
  shutdown_timeout_ms?: number
  stable_after_ms?: number
}) => {
  let data_dir = initial_data_dir
  let state: BundledState = {
    status: 'stopped',
    url: null,
    port: null,
    pid: null,
    data_dir,
    log_path: log.path,
    version,
    failed_restarts: 0,
    retry_at_ms: null,
    error: null,
    stderr_tail: null,
    ingest_disabled: null,
    network_privacy: 'public',
    node_key_pin: read_pin(data_dir),
    started_at_ms: null
  }
  let child: ChildHandle | null = null
  // Bumped by every stop; a start that sees it change gives up.
  let generation = 0
  // Fresh-port relaunches since the node last came up; and whether the next
  // launch must skip the remembered port because something else holds it.
  let port_retries = 0
  let avoid_port: number | null = null
  // Whether this start already ended an orphan; a second refusal fails.
  let orphan_ended = false
  // The last child's PID. It holds record-node's lock until its OS process
  // ends, so a launch waits until it is gone (up to the shutdown timeout).
  // The wait never signals it: unlike a stop, which kills the child it was
  // just running, a launch can come long after, when the PID may belong to
  // another program.
  let previous_pid: number | null = null
  let queue: Promise<unknown> = Promise.resolve()
  const timers = new Set<ReturnType<typeof setTimeout>>()

  const set_state = (patch: Partial<BundledState>): void => {
    state = { ...state, ...patch }
    on_state(state)
  }
  const later = (ms: number, task: () => void): void => {
    const timer = setTimeout(() => { timers.delete(timer); task() }, ms)
    timers.add(timer)
  }
  const clear_timers = (): void => {
    for (const timer of timers) clearTimeout(timer)
    timers.clear()
  }
  const serialize = async <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task)
    queue = run.catch(() => {})
    return await run
  }
  const fail = (error: string): void => {
    set_state({ status: 'failed', url: null, pid: null, retry_at_ms: null, started_at_ms: null, error, stderr_tail: log.stderr_tail() || null })
  }

  // Healthy means: our child, still running, announced it listens on this
  // port, and the node answering there is the one pinned to this data
  // directory (the first healthy start pins it).
  const watch_health = (port: number, current: ChildHandle, listening: { port: number | null }): void => {
    const url = `http://127.0.0.1:${port}`
    const deadline = Date.now() + startup_timeout_ms
    const check = (): void => {
      if (child !== current) return
      health(url).then(async (answer) => {
        if (child !== current) return
        const pin = state.node_key_pin
        if (answer !== null && pin !== null && answer.peer_id !== pin.peer_id) {
          child = null
          current.kill()
          // Before our child announced the port, the answer came from another
          // process holding it: try a fresh port. After, the data directory
          // itself holds a different node than the one pinned.
          if (listening.port === port) {
            fail(`The data directory holds a different node than before (peer ${answer.peer_id}, expected ${pin.peer_id}). It was not used.`)
          } else {
            relaunch_on_fresh_port(port, `Another process answered on port ${port} (peer ${answer.peer_id}).`)
          }
          return
        }
        if (answer !== null && listening.port === port && current.alive()) {
          const next_pin: NodePin = { peer_id: answer.peer_id, identity_address: answer.identity_address }
          if (pin === null || pin.identity_address !== next_pin.identity_address) await write_pin(data_dir, next_pin)
          // Recorded only now that it holds the data directory's lock, so a
          // child refused on the lock never overwrites the holder's record.
          const pid = await current.spawned
          if (child !== current) return
          if (pid !== null) await record_child(data_dir, pid)
          if (child !== current) return
          port_retries = 0
          avoid_port = null
          orphan_ended = false
          set_state({ status: 'running', url, retry_at_ms: null, error: null, node_key_pin: next_pin, started_at_ms: Date.now() })
          // A node that stays up this long has recovered; count from zero again.
          later(stable_after_ms, () => { if (child === current) set_state({ failed_restarts: 0 }) })
        } else if (Date.now() >= deadline) {
          child = null
          current.kill()
          fail(`The bundled node did not answer within ${Math.round(startup_timeout_ms / 1000)} s.`)
        } else {
          later(health_interval_ms, check)
        }
      }).catch(() => {})
    }
    check()
  }

  const relaunch_on_fresh_port = (taken_port: number, reason: string): void => {
    port_retries++
    if (port_retries > MAX_PORT_RETRIES) {
      fail(`${reason} The bundled node could not get a port of its own after ${MAX_PORT_RETRIES} tries.`)
      return
    }
    avoid_port = taken_port
    const relaunch_generation = generation
    set_state({ status: 'starting', url: null, pid: null, started_at_ms: null, error: reason })
    serialize(async () => { if (generation === relaunch_generation && child === null) await launch(relaunch_generation) })
      .catch((error: unknown) => { fail(String(error)) })
  }

  // Another node holds the data directory. When it is an orphan of this
  // app, end it and launch again, once; otherwise say so and stop trying.
  const on_locked = (dir: string): void => {
    const locked_generation = generation
    set_state({ status: 'starting', url: null, pid: null, started_at_ms: null })
    serialize(async () => {
      if (generation !== locked_generation || child !== null) return
      const orphan = orphan_ended ? null : await find_orphan({ data_dir: dir, marker: orphan_marker })
      await checkpoint('orphan')
      if (generation !== locked_generation) return
      if (orphan === null) {
        fail(`Another record-node is using the data directory ${dir}, and it is not one this app left running. Quit it, then retry.`)
        return
      }
      orphan_ended = true
      log.append('err', `ending an orphaned bundled node (process ${orphan}) that held the data directory\n`)
      try { process.kill(orphan, 'SIGTERM') } catch {}
      await ensure_gone(orphan)
      if (generation === locked_generation && child === null) await launch(locked_generation)
    }).catch((error: unknown) => { fail(String(error)) })
  }

  const on_exit = (current: ChildHandle, listening: { port: number | null }, port: number, dir: string) => (code: number | null, signal: string | null): void => {
    current.spawned.then(async (pid) => { if (pid !== null) await clear_child(dir, pid) }).catch(() => {})
    if (child !== current) return
    child = null
    clear_timers()
    if (code === EXIT_DATA_DIR_LOCKED && listening.port === null) {
      on_locked(dir)
      return
    }
    // It never got as far as listening: likely the port was taken. Next time,
    // a fresh one.
    if (listening.port === null) avoid_port = port
    const failed_restarts = state.failed_restarts + 1
    const how = signal === null ? `exit code ${code ?? 'unknown'}` : `signal ${signal}`
    if (failed_restarts > MAX_FAILED_RESTARTS) {
      fail(`The bundled node stopped (${how}) and did not stay up after ${MAX_FAILED_RESTARTS} restarts.`)
      return
    }
    const delay = delay_for(failed_restarts - 1)
    const restart_generation = generation
    set_state({ status: 'restarting', url: null, pid: null, started_at_ms: null, failed_restarts, retry_at_ms: Date.now() + delay, error: `The bundled node stopped (${how}).` })
    later(delay, () => {
      serialize(async () => { if (generation === restart_generation && child === null) await launch(restart_generation) })
        .catch((error: unknown) => { fail(String(error)) })
    })
  }

  // Each await is followed by a generation check: a stop during a start
  // leaves no child behind, and kills one that spawned for a stale start.
  async function launch (started_generation: number): Promise<void> {
    const stale = (): boolean => started_generation !== generation
    if (previous_pid !== null) {
      await wait_gone(previous_pid, shutdown_timeout_ms)
      previous_pid = null
      if (stale()) return
    }
    log.clear_tail()
    const remembered = state.port ?? await preferred_port()
    const port = await pick_port(remembered !== null && remembered === avoid_port ? null : remembered)
    await checkpoint('port')
    if (stale()) return
    // A masked network that cannot start fails the start: the node never
    // runs in the open in its place.
    let bundled_network: BundledNetwork
    try {
      bundled_network = await network()
    } catch (error) {
      if (!stale()) fail(`The bundled node's network could not start: ${error instanceof Error ? error.message : String(error)}`)
      return
    }
    const { privacy, config: network_config } = bundled_network
    await checkpoint('network')
    if (stale()) return
    await mkdir(data_dir, { recursive: true })
    // Loopback only and no browser origins (spec §8.4.2, §8.7.5): record-node
    // binds 127.0.0.1 by default, and this config pins it.
    const node_config = { host: '127.0.0.1', port, cors_origins: [], ytdlp_path: YTDLP_DISABLED_PATH, ...toolchain, ...(network_config === undefined ? {} : { network: network_config }) }
    await writeFile(config_path, `${JSON.stringify(node_config)}\n`, { mode: 0o600 })
    set_state({ network_privacy: privacy })
    await checkpoint('config')
    if (stale()) return
    const listening = { port: null as number | null }
    const current = spawn_child({ cli_path, args: ['--port', String(port), '--data-dir', data_dir, '--config', config_path], env: build_child_env(env) })
    child = current
    current.on_exit(on_exit(current, listening, port, data_dir))
    current.stdout?.on('data', (data: Buffer) => {
      const text = String(data)
      log.append('out', text)
      const announced = LISTENING.exec(text)
      if (announced !== null) listening.port = Number(announced[1])
    })
    current.stderr?.on('data', (data: Buffer) => {
      const text = String(data)
      log.append('err', text)
      const disabled = INGEST_DISABLED.exec(text)
      if (disabled !== null) set_state({ ingest_disabled: disabled[1]?.trim() ?? 'ingest is disabled' })
    })
    const pid = await current.spawned
    previous_pid = pid
    await checkpoint('spawned')
    if (stale()) {
      if (child === current) child = null
      current.kill()
      return
    }
    set_state({ status: state.status === 'restarting' ? 'restarting' : 'starting', port, pid, url: null })
    watch_health(port, current, listening)
  }

  const start_now = async (started_generation: number): Promise<void> => {
    set_state({ status: 'starting', error: null, stderr_tail: null, failed_restarts: 0, ingest_disabled: null })
    orphan_ended = false
    await launch(started_generation)
  }

  // Electron can report a utility child's exit while the OS child is still
  // finishing its SIGTERM shutdown (Linux), so a stop is not clean until
  // nothing answers the child's pid. Wait that out, then force-kill a child
  // that never finishes; without this, a hung shutdown survives a stop.
  const wait_gone = async (pid: number, ms: number): Promise<void> => {
    const deadline = Date.now() + ms
    while (is_alive(pid) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
  }
  const ensure_gone = async (pid: number | null): Promise<void> => {
    if (pid === null) return
    await wait_gone(pid, shutdown_timeout_ms)
    if (!is_alive(pid)) return
    try { process.kill(pid, 'SIGKILL') } catch {}
    await wait_gone(pid, 1_000)
  }

  const stop_now = async (): Promise<void> => {
    clear_timers()
    const current = child
    const pid = state.pid
    child = null
    if (current !== null && current.alive()) {
      current.terminate()
      const forced = setTimeout(() => { current.kill() }, shutdown_timeout_ms)
      await current.exited
      clearTimeout(forced)
    }
    await ensure_gone(pid)
    set_state({ status: 'stopped', url: null, pid: null, retry_at_ms: null, started_at_ms: null })
  }

  return {
    get_state: (): BundledState => state,
    // Moves to another data directory (spec §8.4.1): stops the node, reads
    // the new directory's pin, and starts again when asked.
    relocate: async ({ next_data_dir, start }: { next_data_dir: string, start: boolean }): Promise<void> => {
      generation++
      const relocate_generation = generation
      await serialize(async () => {
        await stop_now()
        data_dir = next_data_dir
        port_retries = 0
        avoid_port = null
        set_state({ data_dir, node_key_pin: read_pin(data_dir), port: null, failed_restarts: 0, error: null, stderr_tail: null })
        if (start) await start_now(relocate_generation)
      })
    },
    start: async (): Promise<void> => {
      const started_generation = generation
      await serialize(async () => {
        if (child !== null || started_generation !== generation) return
        await start_now(started_generation)
      })
    },
    stop: async (): Promise<void> => {
      generation++
      await serialize(stop_now)
    },
    // A manual restart, as after the automatic restarts gave up. Two at once
    // run one after the other, and the second finds a child already there.
    // A stop that comes in meanwhile still wins, through the generation.
    restart: async (): Promise<void> => {
      const restart_generation = generation
      await serialize(async () => {
        if (restart_generation !== generation || child !== null) return
        await stop_now()
        await start_now(restart_generation)
      })
    },
    // Re-reads the identity after an import, so per-node state follows it.
    refresh_identity: async (): Promise<void> => {
      if (state.url === null || state.node_key_pin === null) return
      const answer = await health(state.url)
      if (answer === null || answer.peer_id !== state.node_key_pin.peer_id) return
      const pin = { peer_id: answer.peer_id, identity_address: answer.identity_address }
      await write_pin(data_dir, pin)
      set_state({ node_key_pin: pin })
    },
    // Synchronous, for process exit, where nothing asynchronous will run.
    kill_now: (): void => { child?.kill() }
  }
}
