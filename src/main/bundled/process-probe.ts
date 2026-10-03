// OS process checks for the data-directory lock: whether a PID is alive,
// its command line, and stopping it (SIGTERM, then SIGKILL after 10 s).
// Imports nothing from Electron.

import { execFile } from 'node:child_process'

import type { ProcessProbe } from './node-lock.ts'

export const is_alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM: it exists, but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

const command_of = async (pid: number): Promise<string | null> => await new Promise((resolve) => {
  execFile('ps', ['-p', String(pid), '-o', 'command='], (error, stdout) => { resolve(error === null ? stdout.trim() : null) })
})

const terminate = async (pid: number, grace_ms = 10_000): Promise<void> => {
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    return
  }
  const deadline = Date.now() + grace_ms
  while (is_alive(pid) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 100))
  if (is_alive(pid)) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {}
  }
}

export const os_process_probe: ProcessProbe = { is_alive, command_of, terminate }
