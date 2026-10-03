// OS process checks for the data-directory lock: whether a PID is alive,
// and its command line. Imports nothing from Electron.

import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'

import type { ProcessProbe } from './node-lock.ts'

// Linux: an exited child stays a zombie until its parent reaps it, and
// signal 0 still reaches a zombie. Electron reaps a utility child after its
// exit event, so without this a stopped node reads as alive.
const is_zombie = (pid: number): boolean => {
  if (process.platform !== 'linux') return false
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8')
    // The state follows the parenthesized command name, which may hold spaces.
    return stat.slice(stat.lastIndexOf(')') + 2, stat.lastIndexOf(')') + 3) === 'Z'
  } catch {
    return false
  }
}

export const is_alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
  } catch (error) {
    // EPERM: it exists, but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
  return !is_zombie(pid)
}

const command_of = async (pid: number): Promise<string | null> => await new Promise((resolve) => {
  execFile('ps', ['-p', String(pid), '-o', 'command='], (error, stdout) => { resolve(error === null ? stdout.trim() : null) })
})

export const os_process_probe: ProcessProbe = { is_alive, command_of }
