// The app's bundled node: the manager with its paths under userData and the
// logs directory, the pinned record-node version, and the last-used port
// (spec §8.4.1), spawned through Electron's utilityProcess. The
// Electron-specific half of main/bundled.
//
// utilityProcess rather than the Electron binary with ELECTRON_RUN_AS_NODE,
// so a packaged build can turn the RunAsNode fuse off. record-node's cli.js
// runs under it unchanged (ESM, stdio, SIGTERM, exit codes), and a utility
// child dies with the app, so a force quit leaves no orphan node. Unlike a
// plain Node process, a utility process does not exit when its event loop
// empties; record-node always exits explicitly, on SIGTERM and on error.

import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { app, utilityProcess } from 'electron'

import type { BundledState } from '#shared/bridge.ts'
import type { SpawnChild } from './child-handle.ts'
import { create_node_lock } from './node-lock.ts'
import { create_node_log } from './node-log.ts'
import { create_node_manager } from './node-manager.ts'
import { os_process_probe } from './process-probe.ts'

const CLI_RELATIVE = join('node_modules', 'record-node', 'dist', 'cli.js')

const read_json = (path: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

// record-node's version and the commit the app pins it at, e.g.
// "1.0.0-alpha.0 (80e40a1)".
const pinned_version = (app_root: string): string => {
  const node_version = read_json(join(app_root, 'node_modules', 'record-node', 'package.json'))?.version
  const dependency = (read_json(join(app_root, 'package.json'))?.dependencies as Record<string, string> | undefined)?.['record-node'] ?? ''
  const commit = /#([0-9a-f]{7})/.exec(dependency)?.[1]
  return `${typeof node_version === 'string' ? node_version : 'unknown'}${commit === undefined ? '' : ` (${commit})`}`
}

export const spawn_utility_process: SpawnChild = ({ cli_path, args, env }) => {
  const child = utilityProcess.fork(cli_path, args, { stdio: 'pipe', env, serviceName: 'record-node' })
  let done = false
  const exit_listeners: Array<(code: number | null, signal: string | null) => void> = []
  const exited = new Promise<void>((resolve) => {
    child.once('exit', (code) => {
      done = true
      // A utility process reports a signal death as the signal's number.
      for (const listener of exit_listeners) listener(code, code === 9 ? 'SIGKILL' : null)
      resolve()
    })
  })
  const spawned = new Promise<number | null>((resolve) => {
    child.once('spawn', () => { resolve(child.pid ?? null) })
    exited.then(() => { resolve(null) }).catch(() => {})
  })
  let pid: number | undefined
  spawned.then((value) => { pid = value ?? undefined }).catch(() => {})
  return {
    stdout: child.stdout,
    stderr: child.stderr,
    spawned,
    exited,
    alive: () => !done,
    terminate: () => { if (!done) child.kill() },
    kill: () => {
      if (done || pid === undefined) return
      try {
        process.kill(pid, 'SIGKILL')
      } catch {}
    },
    on_exit: (listener) => { exit_listeners.push(listener) }
  }
}

export const create_bundled_node = ({ user_data, on_state }: { user_data: string, on_state: (state: BundledState) => void }) => {
  const app_root = app.getAppPath()
  const data_dir = join(user_data, 'node-data')
  const config_path = join(user_data, 'bundled-node.json')
  return create_node_manager({
    spawn_child: spawn_utility_process,
    cli_path: join(app_root, CLI_RELATIVE),
    data_dir,
    config_path,
    version: pinned_version(app_root),
    env: process.env,
    lock: create_node_lock({ data_dir, app_pid: process.pid, owner: randomUUID(), probe: os_process_probe, node_marker: CLI_RELATIVE, app_marker: process.execPath }),
    log: create_node_log({ log_dir: app.getPath('logs') }),
    // The last port, so the node's URL stays the same across launches when it can.
    preferred_port: async () => {
      const port = read_json(config_path)?.port
      return typeof port === 'number' && port > 0 ? port : null
    },
    on_state
  })
}
