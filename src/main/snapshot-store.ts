// Holds the hibernation snapshot (spec §8.8.3) in memory as the renderer
// updates it, and writes it to userData every 30 s when it changed and on
// shutdown. Fits it to the user's budget, evicting the track page and then
// the queue but never the library list. Imports nothing from Electron.

import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { NodeResult } from '#shared/bridge.ts'
import {
  DEFAULT_SNAPSHOT_BUDGET_BYTES,
  MAX_SNAPSHOT_BUDGET_BYTES,
  SNAPSHOT_VERSION,
  type HibernationSnapshot,
  type SnapshotInfo
} from '#shared/snapshot.ts'

const refuse = (message: string): NodeResult<never> => ({ ok: false, failure: { kind: 'refused', message } })

const is_object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// The top-level shape; the renderer is the only reader of the contents.
export const check_snapshot = (input: unknown): input is HibernationSnapshot => {
  if (!is_object(input) || input.version !== SNAPSHOT_VERSION) return false
  const { node_url, written_at_ms, route, libraries, active, queue } = input
  if (typeof node_url !== 'string' || typeof written_at_ms !== 'number') return false
  if (typeof route !== 'string' || !route.startsWith('/') || route.length > 200) return false
  if (!Array.isArray(libraries) || !libraries.every(is_object)) return false
  if (active !== null && !(is_object(active) && typeof active.library_address === 'string' && Array.isArray(active.tracks))) return false
  if (queue !== null && !(is_object(queue) && Array.isArray(queue.entries))) return false
  return true
}

// The snapshot serialized within budget_bytes, evicting pagination content
// first. The library list stays even if it alone is over budget.
export const fit_snapshot = ({ snapshot, budget_bytes }: { snapshot: HibernationSnapshot, budget_bytes: number }): string => {
  const candidates: HibernationSnapshot[] = [snapshot, { ...snapshot, active: null }, { ...snapshot, active: null, queue: null }]
  let text = ''
  for (const candidate of candidates) {
    text = JSON.stringify(candidate)
    if (Buffer.byteLength(text) <= budget_bytes) return text
  }
  return text
}

export interface SnapshotStore {
  load: (node_url: string | null) => Promise<HibernationSnapshot | null>
  update: (input: { snapshot: unknown, node_url: string | null }) => NodeResult<SnapshotInfo>
  flush: () => Promise<void>
  // Synchronous on purpose: it runs at quit, where an async write could be
  // cut off before it lands.
  flush_sync: () => void
  wipe: () => Promise<void>
  get_info: () => SnapshotInfo
  set_budget: (input: unknown) => Promise<NodeResult<SnapshotInfo>>
}

export const open_snapshot_store = async ({ snapshot_path, settings_path, log = console.error }: {
  snapshot_path: string
  settings_path: string
  log?: (message: string) => void
}): Promise<SnapshotStore> => {
  let budget_bytes = DEFAULT_SNAPSHOT_BUDGET_BYTES
  try {
    const stored = JSON.parse(await readFile(settings_path, 'utf8')) as { budget_bytes?: unknown }
    if (Number.isInteger(stored.budget_bytes) && (stored.budget_bytes as number) >= 0 && (stored.budget_bytes as number) <= MAX_SNAPSHOT_BUDGET_BYTES) {
      budget_bytes = stored.budget_bytes as number
    }
  } catch {}

  // The latest snapshot text, whether it is on disk, and its size there.
  let pending: string | null = null
  let size_bytes = 0
  try {
    size_bytes = Buffer.byteLength(readFileSync(snapshot_path))
  } catch {}
  let writes: Promise<unknown> = Promise.resolve()

  const write_text = async (text: string): Promise<void> => {
    await mkdir(dirname(snapshot_path), { recursive: true })
    await writeFile(`${snapshot_path}.tmp`, text, { mode: 0o600 })
    await rename(`${snapshot_path}.tmp`, snapshot_path)
    size_bytes = Buffer.byteLength(text)
  }

  // Writes and wipes run one at a time, in order.
  const serialize = async (task: () => Promise<void>): Promise<void> => {
    const run = writes.then(task)
    writes = run.catch((error: unknown) => { log(`snapshot store: ${String(error)}`) })
    await run
  }

  const wipe = async (): Promise<void> => {
    pending = null
    await serialize(async () => {
      await rm(snapshot_path, { force: true })
      size_bytes = 0
    })
  }

  return {
    load: async (node_url) => {
      if (node_url === null || budget_bytes === 0) return null
      try {
        const snapshot = JSON.parse(await readFile(snapshot_path, 'utf8')) as unknown
        if (check_snapshot(snapshot) && snapshot.node_url === node_url) return snapshot
        log(`snapshot store: ignoring a snapshot for another node or in an old format at ${snapshot_path}`)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') log(`snapshot store: ignoring unreadable ${snapshot_path}: ${String(error)}`)
      }
      return null
    },
    update: ({ snapshot, node_url }) => {
      if (!check_snapshot(snapshot)) return refuse('Malformed snapshot.')
      // A snapshot of a node other than the configured one is dropped.
      if (snapshot.node_url !== node_url) return refuse('The snapshot is for another node.')
      if (budget_bytes > 0) pending = fit_snapshot({ snapshot, budget_bytes })
      return { ok: true, data: { size_bytes, budget_bytes } }
    },
    flush: async () => {
      const text = pending
      if (text === null) return
      pending = null
      await serialize(async () => { await write_text(text) })
    },
    flush_sync: () => {
      if (pending === null) return
      try {
        writeFileSync(`${snapshot_path}.tmp`, pending, { mode: 0o600 })
        renameSync(`${snapshot_path}.tmp`, snapshot_path)
        size_bytes = Buffer.byteLength(pending)
      } catch (error) {
        log(`snapshot store: final write failed: ${String(error)}`)
      }
      pending = null
    },
    wipe,
    get_info: () => ({ size_bytes, budget_bytes }),
    set_budget: async (input) => {
      const requested = is_object(input) ? input.budget_bytes : undefined
      if (typeof requested !== 'number' || !Number.isInteger(requested) || requested < 0 || requested > MAX_SNAPSHOT_BUDGET_BYTES) {
        return refuse(`The snapshot budget is a whole number of bytes from 0 to ${MAX_SNAPSHOT_BUDGET_BYTES}.`)
      }
      budget_bytes = requested
      await mkdir(dirname(settings_path), { recursive: true })
      await writeFile(settings_path, `${JSON.stringify({ budget_bytes })}\n`, { mode: 0o600 })
      // 0 disables the snapshot; a smaller budget refits what is on disk.
      if (budget_bytes === 0) {
        await wipe()
        return { ok: true, data: { size_bytes, budget_bytes } }
      }
      if (pending !== null) pending = fit_snapshot({ snapshot: JSON.parse(pending) as HibernationSnapshot, budget_bytes })
      if (size_bytes > budget_bytes) {
        try {
          const current = JSON.parse(await readFile(snapshot_path, 'utf8')) as unknown
          if (check_snapshot(current)) await serialize(async () => { await write_text(fit_snapshot({ snapshot: current, budget_bytes })) })
        } catch {}
      }
      return { ok: true, data: { size_bytes, budget_bytes } }
    }
  }
}
