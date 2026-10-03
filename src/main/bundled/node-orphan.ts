// An orphaned bundled node (spec §8.4.5, §8.4.6). record-node locks its own
// data directory and exits 75 when another node holds it; the app keeps no
// lock. It records the PID of each healthy child in the data directory,
// with its start time, so a spawn refused on the lock can find the holder.
// An orphan is that recorded process, still alive with the same start time,
// no child of this app, whose command line carries the app's marker. Any
// other holder is left alone. Imports nothing from Electron.

import { readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'

import { describe_process, is_alive } from './process-probe.ts'

export const CHILD_FILE = 'record-app-child.json'

// record-node's exit code when another node holds the data directory.
export const EXIT_DATA_DIR_LOCKED = 75

// Text in the command line of every process the app spawns: on macOS its
// bundle, since a utility child runs the bundle's helper executable and its
// command line names neither the script nor the data directory; elsewhere
// its executable's directory.
export const app_marker = (exec_path: string): string => {
  const bundle_end = exec_path.lastIndexOf(`.app${sep}`)
  return bundle_end === -1 ? `${dirname(exec_path)}${sep}` : exec_path.slice(0, bundle_end + 5)
}

interface ChildRecord { pid: number, started: string }

const read_recorded = async (data_dir: string): Promise<ChildRecord | null> => {
  try {
    const { pid, started } = JSON.parse(await readFile(join(data_dir, CHILD_FILE), 'utf8')) as { pid?: unknown, started?: unknown }
    return typeof pid === 'number' && Number.isInteger(pid) && pid > 0 && typeof started === 'string' ? { pid, started } : null
  } catch {
    return null
  }
}

// A child whose start time cannot be read is not recorded, so it can never
// be taken for an orphan.
export const record_child = async (data_dir: string, pid: number): Promise<void> => {
  const started = (await describe_process(pid))?.started
  if (started === undefined) return
  await writeFile(join(data_dir, CHILD_FILE), `${JSON.stringify({ pid, started })}\n`, { mode: 0o600 })
}

// Only the record of this pid, so a later child's record survives.
export const clear_child = async (data_dir: string, pid: number): Promise<void> => {
  if ((await read_recorded(data_dir))?.pid === pid) await rm(join(data_dir, CHILD_FILE), { force: true })
}

export const find_orphan = async ({ data_dir, marker }: { data_dir: string, marker: string }): Promise<number | null> => {
  const recorded = await read_recorded(data_dir)
  if (recorded === null || recorded.pid === process.pid || !is_alive(recorded.pid)) return null
  const found = await describe_process(recorded.pid)
  return found !== null && found.started === recorded.started && found.ppid !== process.pid && found.command.includes(marker) ? recorded.pid : null
}
