// The bundled node (spec §8.4): spawned as a child under Electron's own
// Node (ELECTRON_RUN_AS_NODE), on a loopback port with a data directory
// under userData; health-checked every 250 ms until it answers or 30 s
// pass; restarted after a crash with backoff (at once, then 1, 2, 4, 8 s, up
// to 30 s) until five restarts in a row fail; and stopped with SIGTERM, then
// SIGKILL after 10 s. Imports nothing from Electron.

import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'

import type { BundledState } from '#shared/bridge.ts'
import type { create_node_lock } from './node-lock.ts'
import type { create_node_log } from './node-log.ts'

const RESTART_DELAYS_MS = [0, 1_000, 2_000, 4_000, 8_000]
const RESTART_MAX_DELAY_MS = 30_000
export const MAX_FAILED_RESTARTS = 5
const INGEST_DISABLED = /ingest disabled: (.*)/

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

export const probe_health = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(`${url}/api/settings`, { signal: AbortSignal.timeout(1_000) })
    return response.ok
  } catch {
    return false
  }
}

export const create_node_manager = ({
  node_path, cli_path, data_dir, config_path, version, env, lock, log, on_state,
  preferred_port = async () => null,
  health = probe_health,
  delay_for = restart_delay_ms,
  health_interval_ms = 250,
  startup_timeout_ms = 30_000,
  shutdown_timeout_ms = 10_000,
  stable_after_ms = 60_000
}: {
  node_path: string
  cli_path: string
  data_dir: string
  config_path: string
  version: string
  env: NodeJS.ProcessEnv
  lock: ReturnType<typeof create_node_lock>
  log: ReturnType<typeof create_node_log>
  on_state: (state: BundledState) => void
  preferred_port?: () => Promise<number | null>
  health?: (url: string) => Promise<boolean>
  delay_for?: (attempt: number) => number
  health_interval_ms?: number
  startup_timeout_ms?: number
  shutdown_timeout_ms?: number
  stable_after_ms?: number
}) => {
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
    ingest_disabled: null
  }
  let child: ChildProcess | null = null
  let exited: Promise<void> = Promise.resolve()
  let stopping = false
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

  const fail = (error: string): void => {
    set_state({ status: 'failed', url: null, pid: null, retry_at_ms: null, error, stderr_tail: log.stderr_tail() || null })
  }

  const watch_health = (url: string, current: ChildProcess): void => {
    const deadline = Date.now() + startup_timeout_ms
    const check = (): void => {
      if (child !== current) return
      health(url).then((ok) => {
        if (child !== current) return
        if (ok) {
          set_state({ status: 'running', url, retry_at_ms: null, error: null })
          // A node that stays up this long has recovered; count from zero again.
          later(stable_after_ms, () => { if (child === current) set_state({ failed_restarts: 0 }) })
        } else if (Date.now() >= deadline) {
          child = null
          current.kill('SIGKILL')
          fail(`The bundled node did not answer within ${Math.round(startup_timeout_ms / 1000)} s.`)
        } else {
          later(health_interval_ms, check)
        }
      }).catch(() => {})
    }
    check()
  }

  const on_exit = (current: ChildProcess) => (code: number | null, signal: NodeJS.Signals | null): void => {
    lock.record_child(null).catch(() => {})
    if (child !== current || stopping) return
    child = null
    clear_timers()
    const failed_restarts = state.failed_restarts + 1
    const how = signal === null ? `exit code ${code ?? 'unknown'}` : `signal ${signal}`
    if (failed_restarts > MAX_FAILED_RESTARTS) {
      fail(`The bundled node stopped (${how}) and did not stay up after ${MAX_FAILED_RESTARTS} restarts.`)
      return
    }
    const delay = delay_for(failed_restarts - 1)
    set_state({ status: 'restarting', url: null, pid: null, failed_restarts, retry_at_ms: Date.now() + delay, error: `The bundled node stopped (${how}).` })
    later(delay, () => { launch().catch((error: unknown) => { fail(String(error)) }) })
  }

  async function launch (): Promise<void> {
    log.clear_tail()
    const port = await choose_port(state.port ?? await preferred_port())
    await mkdir(data_dir, { recursive: true })
    // Loopback only and no browser origins (spec §8.4.2, §8.7.5): record-node
    // binds 127.0.0.1 by default, and this config pins it.
    await writeFile(config_path, `${JSON.stringify({ host: '127.0.0.1', port, cors_origins: [] })}\n`, { mode: 0o600 })
    const { RECORD_CONFIG: _ignored, ...child_env } = env
    const current = spawn(node_path, [cli_path, '--port', String(port), '--data-dir', data_dir, '--config', config_path], {
      env: { ...child_env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    child = current
    exited = new Promise((resolve) => { current.once('exit', () => { resolve() }) })
    current.on('exit', on_exit(current))
    current.stdout?.on('data', (data: Buffer) => { log.append('out', String(data)) })
    current.stderr?.on('data', (data: Buffer) => {
      const text = String(data)
      log.append('err', text)
      const disabled = INGEST_DISABLED.exec(text)
      if (disabled !== null) set_state({ ingest_disabled: disabled[1]?.trim() ?? 'ingest is disabled' })
    })
    set_state({ status: state.status === 'restarting' ? 'restarting' : 'starting', port, pid: current.pid ?? null, url: null })
    if (current.pid !== undefined) await lock.record_child(current.pid)
    watch_health(`http://127.0.0.1:${port}`, current)
  }

  const stop = async (): Promise<void> => {
    stopping = true
    clear_timers()
    const current = child
    child = null
    if (current !== null && current.exitCode === null && current.signalCode === null) {
      current.kill('SIGTERM')
      const forced = setTimeout(() => { current.kill('SIGKILL') }, shutdown_timeout_ms)
      await exited
      clearTimeout(forced)
    }
    await lock.release()
    set_state({ status: 'stopped', url: null, pid: null, retry_at_ms: null })
  }

  return {
    get_state: (): BundledState => state,
    start: async (): Promise<void> => {
      if (child !== null) return
      stopping = false
      set_state({ status: 'starting', error: null, stderr_tail: null, failed_restarts: 0, ingest_disabled: null })
      const locked = await lock.acquire()
      if (!locked.ok) {
        fail(locked.reason)
        return
      }
      await launch().catch((error: unknown) => { fail(String(error)) })
    },
    stop,
    restart: async (): Promise<void> => {
      if (child !== null) await stop()
      stopping = false
      set_state({ failed_restarts: 0 })
      clear_timers()
      const locked = await lock.acquire()
      if (!locked.ok) {
        fail(locked.reason)
        return
      }
      set_state({ status: 'starting', error: null, stderr_tail: null })
      await launch().catch((error: unknown) => { fail(String(error)) })
    },
    // Synchronous, for process exit, where nothing asynchronous will run.
    kill_now: (): void => { child?.kill('SIGKILL') }
  }
}
