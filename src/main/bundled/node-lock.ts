// The bundled node's data-directory lock (spec §8.4.6). record-node takes
// none of its own, so the app holds one: a lock file in the data directory
// naming the app process that owns it and the node child it runs. A lock
// whose app is gone is stale; if its child outlived the app (a force quit),
// that orphan is stopped before a new child starts (§8.4.5). Imports
// nothing from Electron.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const LOCK_FILE = 'record-app.lock'

export interface LockRecord {
  app_pid: number
  owner: string
  child_pid: number | null
}

export interface ProcessProbe {
  is_alive: (pid: number) => boolean
  // The process's command line, or null when it cannot be read.
  command_of: (pid: number) => Promise<string | null>
  terminate: (pid: number) => Promise<void>
}

export type LockResult =
  | { ok: true, cleaned: 'none' | 'stale' | 'orphan' }
  | { ok: false, reason: string }

const read_record = async (path: string): Promise<LockRecord | null> => {
  try {
    const record = JSON.parse(await readFile(path, 'utf8')) as Partial<LockRecord>
    if (typeof record.app_pid !== 'number' || typeof record.owner !== 'string') return null
    return { app_pid: record.app_pid, owner: record.owner, child_pid: typeof record.child_pid === 'number' ? record.child_pid : null }
  } catch {
    return null
  }
}

export const create_node_lock = ({ data_dir, app_pid, owner, probe, node_marker }: {
  data_dir: string
  app_pid: number
  // Unique per manager, so two managers in one process still exclude each other.
  owner: string
  probe: ProcessProbe
  // Text in the command line that marks a process as this node's child.
  node_marker: string
}) => {
  const path = join(data_dir, LOCK_FILE)

  const write = async (record: LockRecord, flag: 'wx' | 'w'): Promise<void> => {
    await writeFile(path, `${JSON.stringify(record)}\n`, { flag, mode: 0o600 })
  }

  return {
    path,
    acquire: async (): Promise<LockResult> => {
      await mkdir(data_dir, { recursive: true, mode: 0o700 })
      let cleaned: 'none' | 'stale' | 'orphan' = 'none'
      const existing = await read_record(path)
      if (existing !== null) {
        if (existing.owner === owner) return { ok: true, cleaned }
        if (probe.is_alive(existing.app_pid)) {
          return { ok: false, reason: `The bundled node's data directory is in use by another running copy of the app (process ${existing.app_pid}).` }
        }
        cleaned = 'stale'
        const orphan = existing.child_pid
        if (orphan !== null && probe.is_alive(orphan)) {
          const command = await probe.command_of(orphan)
          // Only a process that is plainly this node, on this data directory, is stopped.
          if (command !== null && command.includes(node_marker) && command.includes(data_dir)) {
            await probe.terminate(orphan)
            cleaned = 'orphan'
          }
        }
        await rm(path, { force: true })
      }
      try {
        await write({ app_pid, owner, child_pid: null }, 'wx')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') return { ok: false, reason: 'Another process took the bundled node\'s data directory lock first.' }
        throw error
      }
      return { ok: true, cleaned }
    },
    record_child: async (child_pid: number | null): Promise<void> => { await write({ app_pid, owner, child_pid }, 'w') },
    release: async (): Promise<void> => {
      const existing = await read_record(path)
      if (existing?.owner === owner) await rm(path, { force: true })
    }
  }
}
