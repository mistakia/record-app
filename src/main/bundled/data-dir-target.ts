// Where a moved bundled-node data directory goes (spec §8.4.1, §8.10.9). The
// node never writes into the folder the user picks: it gets its own
// subfolder there, which alone is made private, so picking a home folder or
// a drive root neither strips its access nor mixes the node's files with the
// user's. Imports nothing from Electron.

import { chmod, lstat, mkdir, readdir, realpath } from 'node:fs/promises'
import { isAbsolute, join, relative } from 'node:path'

import { PIN_FILE } from './node-pin.ts'

export const NODE_DATA_FOLDER = 'Record Node Data'

// What a record-node data directory holds (record-node data_paths), and the app's pin.
const NODE_DATA_MARKERS = new Set([PIN_FILE, 'identity.key', 'libraries.json', 'datastore', 'blocks'])

export type DataDirTarget =
  | { kind: 'new', data_dir: string }
  | { kind: 'existing', data_dir: string }
  | { kind: 'unchanged' }
  | { kind: 'refused', message: string }

const inside = (parent: string, child: string): boolean => {
  const path = relative(parent, child)
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

const real = async (path: string): Promise<string> => await realpath(path).catch(() => path)

export const resolve_data_dir_target = async ({ chosen, current, user_data, app_path }: {
  chosen: string
  current: string
  user_data: string
  app_path: string
}): Promise<DataDirTarget> => {
  if (!isAbsolute(chosen)) return { kind: 'refused', message: 'The chosen folder is not an absolute path.' }
  let parent: string
  try {
    parent = await realpath(chosen)
  } catch {
    return { kind: 'refused', message: 'The chosen folder cannot be read.' }
  }
  const data_dir = join(parent, NODE_DATA_FOLDER)
  const current_dir = await real(current)
  if (data_dir === current_dir) return { kind: 'unchanged' }
  if (inside(await real(user_data), data_dir)) return { kind: 'refused', message: 'The data folder cannot be inside the app\'s own data folder.' }
  if (inside(current_dir, data_dir)) return { kind: 'refused', message: 'The data folder cannot be inside the current data folder.' }
  if (inside(await real(app_path), data_dir)) return { kind: 'refused', message: 'The data folder cannot be inside the app itself.' }
  const found = await lstat(data_dir).catch(() => null)
  if (found === null) return { kind: 'new', data_dir }
  if (found.isSymbolicLink() || !found.isDirectory()) return { kind: 'refused', message: `${data_dir} exists and is not a plain folder.` }
  const entries = await readdir(data_dir)
  if (!entries.some((name) => NODE_DATA_MARKERS.has(name))) {
    return { kind: 'refused', message: `${data_dir} already exists and holds no record-node data. Choose another folder, or move or rename that one.` }
  }
  return { kind: 'existing', data_dir }
}

// Creates the node's subfolder when new, and makes it, never its parent, private (0700).
export const prepare_data_dir = async (target: { kind: 'new' | 'existing', data_dir: string }): Promise<void> => {
  if (target.kind === 'new') await mkdir(target.data_dir, { mode: 0o700 })
  await chmod(target.data_dir, 0o700)
}
