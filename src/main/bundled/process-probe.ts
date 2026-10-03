// OS process checks: whether a PID is alive, and its parent, start time,
// and command line. Imports nothing from Electron.

import { execFile } from 'node:child_process'
import { readlink } from 'node:fs/promises'

export const is_alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM: it exists, but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

export interface ProcessInfo {
  ppid: number
  // When it started, as ps prints it ("Sat Oct  3 18:39:07 2026"), so a
  // PID the OS has since given to another process does not match.
  started: string
  command: string
  // The executable's path from /proc on Linux, where a utility child's
  // command line starts with /proc/self/exe instead; null elsewhere.
  executable: string | null
}

// The process's details, or null when they cannot be read.
export const describe_process = async (pid: number): Promise<ProcessInfo | null> => await new Promise((resolve) => {
  execFile('ps', ['-p', String(pid), '-o', 'ppid=,lstart=,command='], { env: { ...process.env, LC_ALL: 'C' } }, (error, stdout) => {
    const match = error === null ? /^\s*(\d+)\s+(\w{3}\s+\w{3}\s+\d+\s+[\d:]+\s+\d{4})\s+(.*)$/s.exec(stdout.trim()) : null
    if (match === null) {
      resolve(null)
      return
    }
    const info = { ppid: Number(match[1]), started: match[2] as string, command: match[3] as string }
    if (process.platform !== 'linux') {
      resolve({ ...info, executable: null })
      return
    }
    readlink(`/proc/${pid}/exe`).then((executable) => { resolve({ ...info, executable }) }, () => { resolve({ ...info, executable: null }) })
  })
})
