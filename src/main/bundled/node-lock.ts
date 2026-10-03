// The bundled node's data-directory lock (spec §8.4.6). record-node takes
// none of its own, so the app holds one: a lock file in the data directory
// naming the app process that owns it and, for diagnosis, the node child
// it runs. A lock whose app is gone (or whose PID now belongs to another
// program) is stale and is replaced. The child needs no cleanup: a
// utilityProcess child dies with the app, so a force quit leaves no orphan
// (§8.4.5). Imports nothing from Electron.

import { link, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
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
}

export type LockResult =
  | { ok: true, cleaned: 'none' | 'stale' }
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

export const create_node_lock = ({ data_dir, app_pid, owner, probe, app_marker }: {
  data_dir: string
  app_pid: number
  // Unique per manager, so two managers in one process still exclude each other.
  owner: string
  probe: ProcessProbe
  // Text in the command line of the app itself (its executable path), so a
  // PID the OS has since given to another program does not hold the lock.
  app_marker: string
}) => {
  const path = join(data_dir, LOCK_FILE)

  const write = async (record: LockRecord): Promise<void> => {
    await writeFile(path, `${JSON.stringify(record)}\n`, { mode: 0o600 })
  }

  return {
    path,
    acquire: async (): Promise<LockResult> => {
      await mkdir(data_dir, { recursive: true, mode: 0o700 })
      let cleaned: 'none' | 'stale' = 'none'
      const existing = await read_record(path)
      if (existing !== null) {
        if (existing.owner === owner) return { ok: true, cleaned }
        if (probe.is_alive(existing.app_pid) && (await probe.command_of(existing.app_pid))?.includes(app_marker) === true) {
          return { ok: false, reason: `The bundled node's data directory is in use by another running copy of the app (process ${existing.app_pid}).` }
        }
        cleaned = 'stale'
        await rm(path, { force: true })
      }
      // Written whole to a private file, then linked into place: link fails if
      // the lock exists, so of two acquirers racing past a stale lock, one wins.
      const temporary_path = `${path}.${owner}.tmp`
      await writeFile(temporary_path, `${JSON.stringify({ app_pid, owner, child_pid: null })}\n`, { mode: 0o600 })
      try {
        await link(temporary_path, path)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') return { ok: false, reason: 'Another process took the bundled node\'s data directory lock first.' }
        throw error
      } finally {
        await rm(temporary_path, { force: true })
      }
      return { ok: true, cleaned }
    },
    record_child: async (child_pid: number | null): Promise<void> => { await write({ app_pid, owner, child_pid }) },
    release: async (): Promise<void> => {
      const existing = await read_record(path)
      if (existing?.owner === owner) await rm(path, { force: true })
    }
  }
}
