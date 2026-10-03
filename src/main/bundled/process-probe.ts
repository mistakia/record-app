// OS process checks: whether a PID is alive, and its parent and command
// line. Imports nothing from Electron.

import { execFile } from 'node:child_process'

export const is_alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM: it exists, but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

// The process's parent PID and command line, or null when it cannot be read.
export const describe_process = async (pid: number): Promise<{ ppid: number, command: string } | null> => await new Promise((resolve) => {
  execFile('ps', ['-p', String(pid), '-o', 'ppid=,command='], (error, stdout) => {
    const match = error === null ? /^\s*(\d+)\s+(.*)$/s.exec(stdout.trim()) : null
    resolve(match === null ? null : { ppid: Number(match[1]), command: match[2] as string })
  })
})
