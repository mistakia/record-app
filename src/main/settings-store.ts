// The app's settings, one small JSON file under the app's userData directory
// (for now: the update channel of spec §8.2.5). Modeled on the connection
// store: a validated read with a default when none, an atomic owner-only
// write, and one save at a time. Imports nothing from Electron, so tests
// drive it under Bun.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { NodeResult, UpdateChannel } from '#shared/bridge.ts'

export interface AppSettings {
  // The update channel the app checks (spec §8.2.5).
  update_channel: UpdateChannel
}

const DEFAULT_SETTINGS: AppSettings = Object.freeze({ update_channel: 'stable' })

const check_channel = (input: unknown): input is UpdateChannel => input === 'stable' || input === 'beta'

export interface SettingsStore {
  get: () => AppSettings
  // The channel chosen; a refused value changes and writes nothing. The new
  // channel itself is what the bridge promises, so a save reads as one value.
  set_channel: (input: unknown) => Promise<NodeResult<UpdateChannel>>
}

const read_stored_settings = async ({ file_path, log }: { file_path: string, log: (message: string) => void }): Promise<AppSettings> => {
  let text: string
  try {
    text = await readFile(file_path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') log(`settings store: cannot read ${file_path}: ${String(error)}`)
    return DEFAULT_SETTINGS
  }
  try {
    const stored = JSON.parse(text) as { update_channel?: unknown }
    if (check_channel(stored.update_channel)) return { update_channel: stored.update_channel }
    log(`settings store: ignoring a channel that is not stable or beta in ${file_path}`)
  } catch (error) {
    log(`settings store: ignoring corrupt ${file_path}: ${String(error)}`)
  }
  return DEFAULT_SETTINGS
}

export const open_settings_store = async ({ file_path, log = console.error }: {
  file_path: string
  log?: (message: string) => void
}): Promise<SettingsStore> => {
  let current = await read_stored_settings({ file_path, log })
  // Saves run one at a time, so two writes never share the temporary file and
  // the last save to finish is the one on disk and in memory.
  let saves: Promise<unknown> = Promise.resolve()

  const write = async (settings: AppSettings): Promise<void> => {
    await mkdir(dirname(file_path), { recursive: true })
    const temporary_path = `${file_path}.tmp`
    await writeFile(temporary_path, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 })
    await rename(temporary_path, file_path)
    current = settings
  }

  return {
    get: () => current,
    set_channel: async (input) => {
      if (!check_channel(input)) return { ok: false, failure: { kind: 'refused', message: 'The update channel must be stable or beta.' } }
      const next: AppSettings = { update_channel: input }
      const saved = saves.then(async () => { await write(next) })
      saves = saved.catch(() => {})
      await saved
      return { ok: true, data: input }
    }
  }
}
