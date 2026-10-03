// The connection settings (spec §8.8.4 Layer C): `{ mode, node_url }` in one
// JSON file under the app's userData directory. Imports nothing from
// Electron; index.ts passes the path.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { ConnectionConfig, NodeResult } from '#shared/bridge.ts'
import { check_node_url } from '#shared/node-url.ts'

// Bundled mode is not built yet, so the app starts in remote mode with no
// node configured until the user saves one.
const DEFAULT_CONFIG: ConnectionConfig = Object.freeze({ mode: 'remote', node_url: null })

// A config as the renderer or the file supplied it: remote mode needs a valid
// node URL, and bundled mode is refused until it exists.
export const check_connection_config = (input: unknown): NodeResult<ConnectionConfig> => {
  const { mode, node_url } = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>
  if (mode === 'bundled') return { ok: false, failure: { kind: 'refused', message: 'Bundled mode is not available yet.' } }
  if (mode !== 'remote') return { ok: false, failure: { kind: 'refused', message: 'Mode must be bundled or remote.' } }
  if (typeof node_url !== 'string') return { ok: false, failure: { kind: 'refused', message: 'Enter a node URL.' } }
  const checked = check_node_url(node_url)
  if (!checked.ok) return { ok: false, failure: { kind: 'refused', message: checked.reason } }
  return { ok: true, data: { mode, node_url: checked.node_url } }
}

export interface ConnectionStore {
  get: () => ConnectionConfig
  save: (input: unknown) => Promise<NodeResult<ConnectionConfig>>
}

export const open_connection_store = async ({ file_path }: { file_path: string }): Promise<ConnectionStore> => {
  let current = DEFAULT_CONFIG
  try {
    const stored = check_connection_config(JSON.parse(await readFile(file_path, 'utf8')))
    if (stored.ok) current = stored.data
  } catch {}

  return {
    get: () => current,
    save: async (input) => {
      const checked = check_connection_config(input)
      if (!checked.ok) return checked
      await mkdir(dirname(file_path), { recursive: true })
      const temporary_path = `${file_path}.tmp`
      await writeFile(temporary_path, `${JSON.stringify(checked.data, null, 2)}\n`, { mode: 0o600 })
      await rename(temporary_path, file_path)
      current = checked.data
      return checked
    }
  }
}
