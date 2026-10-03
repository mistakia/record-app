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
import { existsSync, readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'

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

// Where the bundled node keeps its data (spec §8.4.1): under userData by
// default, or where the user moved it, recorded in bundled-settings.json.
export const default_data_dir = (user_data: string): string => join(user_data, 'node-data')
const settings_path = (user_data: string): string => join(user_data, 'bundled-settings.json')

export const read_data_dir = (user_data: string): string => {
  const chosen = read_json(settings_path(user_data))?.data_dir
  return typeof chosen === 'string' && isAbsolute(chosen) ? chosen : default_data_dir(user_data)
}

export const save_data_dir = async (user_data: string, data_dir: string): Promise<void> => {
  await writeFile(settings_path(user_data), `${JSON.stringify({ data_dir })}\n`, { mode: 0o600 })
}

// The app's logs directory, except under a --user-data-dir profile (the
// smokes), whose node.log stays inside that profile.
export const logs_dir = (user_data: string): string =>
  app.commandLine.hasSwitch('user-data-dir') ? join(user_data, 'logs') : app.getPath('logs')

// The pinned ffmpeg and fpcalc (cli/build-toolchain.sh): Resources/bin in a
// packaged app, toolchain/bin in a checkout that has built them; otherwise
// none, and record-node looks on PATH (spec §8.2.6).
export const bundled_toolchain = (app_root: string): { ffmpeg_path: string, fpcalc_path: string } | null => {
  const bin = app.isPackaged ? join(process.resourcesPath, 'bin') : join(app_root, 'toolchain', 'bin')
  const paths = { ffmpeg_path: join(bin, 'ffmpeg'), fpcalc_path: join(bin, 'fpcalc') }
  return existsSync(paths.ffmpeg_path) && existsSync(paths.fpcalc_path) ? paths : null
}

export const create_bundled_node = ({ user_data, on_state }: { user_data: string, on_state: (state: BundledState) => void }) => {
  const app_root = app.getAppPath()
  const config_path = join(user_data, 'bundled-node.json')
  const owner = randomUUID()
  return create_node_manager({
    spawn_child: spawn_utility_process,
    cli_path: join(app_root, CLI_RELATIVE),
    data_dir: read_data_dir(user_data),
    config_path,
    version: pinned_version(app_root),
    env: process.env,
    toolchain: bundled_toolchain(app_root),
    lock_for: (data_dir) => create_node_lock({ data_dir, app_pid: process.pid, owner, probe: os_process_probe, app_marker: process.execPath }),
    log: create_node_log({ log_dir: logs_dir(user_data) }),
    // The last port, so the node's URL stays the same across launches when it can.
    preferred_port: async () => {
      const port = read_json(config_path)?.port
      return typeof port === 'number' && port > 0 ? port : null
    },
    on_state
  })
}
