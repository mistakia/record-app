// An orphaned bundled node (spec §8.4.5, §8.4.6). record-node locks its own
// data directory and exits 75 when another node holds it; the app keeps no
// lock. It records the PID of each child it spawns in the data directory,
// so a spawn refused on the lock can find the holder. An orphan is that
// recorded PID, still alive, no child of this app, whose command line
// carries the app's marker. Any other holder is left alone. Imports nothing
// from Electron.

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
  const bundle_end = exec_path.indexOf(`.app${sep}`)
  return bundle_end === -1 ? `${dirname(exec_path)}${sep}` : exec_path.slice(0, bundle_end + 5)
}

const read_recorded = async (data_dir: string): Promise<number | null> => {
  try {
    const { pid } = JSON.parse(await readFile(join(data_dir, CHILD_FILE), 'utf8')) as { pid?: unknown }
    return typeof pid === 'number' && Number.isInteger(pid) && pid > 0 ? pid : null
  } catch {
    return null
  }
}

export const record_child = async (data_dir: string, pid: number): Promise<void> => {
  await writeFile(join(data_dir, CHILD_FILE), `${JSON.stringify({ pid })}\n`, { mode: 0o600 })
}

// Only the record of this pid, so a later child's record survives.
export const clear_child = async (data_dir: string, pid: number): Promise<void> => {
  if (await read_recorded(data_dir) === pid) await rm(join(data_dir, CHILD_FILE), { force: true })
}

export const find_orphan = async ({ data_dir, marker }: { data_dir: string, marker: string }): Promise<number | null> => {
  const pid = await read_recorded(data_dir)
  if (pid === null || pid === process.pid || !is_alive(pid)) return null
  const found = await describe_process(pid)
  return found !== null && found.ppid !== process.pid && found.command.includes(marker) ? pid : null
}
