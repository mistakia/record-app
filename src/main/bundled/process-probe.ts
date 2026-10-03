// OS process checks for the data-directory lock: whether a PID is alive,
// and its command line. Imports nothing from Electron.

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

export const os_process_probe: ProcessProbe = { is_alive, command_of }
