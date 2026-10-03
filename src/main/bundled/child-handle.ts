// The bundled node child as the manager sees it, whatever spawned it. The
// app spawns through Electron's utilityProcess (bundled-node.ts); the tests
// also spawn through child_process under the Electron binary with
// ELECTRON_RUN_AS_NODE, which is this file's adapter. Imports nothing from
// Electron.

import { spawn } from 'node:child_process'

// Only 'data' is used, so Node's Readable and Electron's stream both fit.
export interface OutputStream {
  on: (event: 'data', listener: (data: Buffer) => void) => unknown
}

export interface ChildHandle {
  stdout: OutputStream | null
  stderr: OutputStream | null
  // The PID once the process exists; null when it never started.
  spawned: Promise<number | null>
  exited: Promise<void>
  alive: () => boolean
  // SIGTERM, for a graceful stop.
  terminate: () => void
  // SIGKILL.
  kill: () => void
  on_exit: (listener: (code: number | null, signal: string | null) => void) => void
}

export type SpawnChild = (input: { cli_path: string, args: string[], env: Record<string, string> }) => ChildHandle

export const spawn_node_process = ({ node_path }: { node_path: string }): SpawnChild => ({ cli_path, args, env }) => {
  const child = spawn(node_path, [cli_path, ...args], { env: { ...env, ELECTRON_RUN_AS_NODE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] })
  let done = false
  const exited = new Promise<void>((resolve) => { child.once('exit', () => { done = true; resolve() }) })
  const spawned = new Promise<number | null>((resolve) => {
    child.once('spawn', () => { resolve(child.pid ?? null) })
    child.once('error', () => { resolve(null) })
  })
  return {
    stdout: child.stdout,
    stderr: child.stderr,
    spawned,
    exited,
    alive: () => !done,
    terminate: () => { if (!done) child.kill('SIGTERM') },
    kill: () => { if (!done) child.kill('SIGKILL') },
    on_exit: (listener) => { child.on('exit', (code, signal) => { listener(code, signal) }) }
  }
}
