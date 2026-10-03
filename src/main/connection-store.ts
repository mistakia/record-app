// The connection settings (spec §8.8.4 Layer C): `{ mode, node_url }` in one
// JSON file under the app's userData directory. Imports nothing from
// Electron; index.ts passes the path.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { ConnectionConfig, NodeResult } from '#shared/bridge.ts'
import { check_node_url } from '#shared/node-url.ts'

// First launch runs the bundled node (spec §8.3.3).
const DEFAULT_CONFIG: ConnectionConfig = Object.freeze({ mode: 'bundled', node_url: null })

// A config as the renderer or the file supplied it: remote mode needs a valid
// node URL; bundled mode keeps the last remote URL, if any, for switching back.
export const check_connection_config = (input: unknown): NodeResult<ConnectionConfig> => {
  const { mode, node_url } = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>
  if (mode !== 'remote' && mode !== 'bundled') return { ok: false, failure: { kind: 'refused', message: 'Mode must be bundled or remote.' } }
  if (mode === 'bundled' && (node_url === null || node_url === undefined || node_url === '')) return { ok: true, data: { mode, node_url: null } }
  if (typeof node_url !== 'string') return { ok: false, failure: { kind: 'refused', message: 'Enter a node URL.' } }
  const checked = check_node_url(node_url)
  if (!checked.ok) return { ok: false, failure: { kind: 'refused', message: checked.reason } }
  return { ok: true, data: { mode, node_url: checked.node_url } }
}

export interface ConnectionStore {
  get: () => ConnectionConfig
  save: (input: unknown) => Promise<NodeResult<ConnectionConfig>>
}

// The saved config, or the default when there is none. A file that exists
// but does not hold a valid config is reported, then replaced on next save.
const read_stored_config = async ({ file_path, log }: { file_path: string, log: (message: string) => void }): Promise<ConnectionConfig> => {
  let text: string
  try {
    text = await readFile(file_path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') log(`connection store: cannot read ${file_path}: ${String(error)}`)
    return DEFAULT_CONFIG
  }
  try {
    const stored = check_connection_config(JSON.parse(text))
    if (stored.ok) return stored.data
    log(`connection store: ignoring invalid config in ${file_path}: ${stored.failure.message}`)
  } catch (error) {
    log(`connection store: ignoring corrupt ${file_path}: ${String(error)}`)
  }
  return DEFAULT_CONFIG
}

export const open_connection_store = async ({ file_path, log = console.error }: {
  file_path: string
  log?: (message: string) => void
}): Promise<ConnectionStore> => {
  let current = await read_stored_config({ file_path, log })
  // Saves run one at a time, so two writes never share the temporary file and
  // the last save to finish is the one on disk and in memory.
  let saves: Promise<unknown> = Promise.resolve()

  const write = async (config: ConnectionConfig): Promise<void> => {
    await mkdir(dirname(file_path), { recursive: true })
    const temporary_path = `${file_path}.tmp`
    await writeFile(temporary_path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 })
    await rename(temporary_path, file_path)
    current = config
  }

  return {
    get: () => current,
    save: async (input) => {
      const checked = check_connection_config(input)
      if (!checked.ok) return checked
      const saved = saves.then(async () => { await write(checked.data) })
      saves = saved.catch(() => {})
      await saved
      return checked
    }
  }
}
