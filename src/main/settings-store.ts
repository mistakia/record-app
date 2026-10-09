// The app's settings, one small JSON file under the app's userData directory:
// the update channel of spec §8.2.5 and the bundled node's network privacy of
// §8.3.5. Modeled on the connection
// store: a validated read with a default when none, an atomic owner-only
// write, and one save at a time. Imports nothing from Electron, so tests
// drive it under Bun.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { NetworkPrivacy, NodeResult, UpdateChannel } from '#shared/bridge.ts'

export interface AppSettings {
  // The update channel the app checks (spec §8.2.5).
  update_channel: UpdateChannel
  // Public, or masked through Tor (spec §8.3.5).
  network_privacy: NetworkPrivacy
}

const DEFAULT_SETTINGS: AppSettings = Object.freeze({ update_channel: 'stable', network_privacy: 'public' })

const check_channel = (input: unknown): input is UpdateChannel => input === 'stable' || input === 'beta'
const check_privacy = (input: unknown): input is NetworkPrivacy => input === 'public' || input === 'masked'

export interface SettingsStore {
  get: () => AppSettings
  // The channel chosen; a refused value changes and writes nothing. The new
  // channel itself is what the bridge promises, so a save reads as one value.
  set_channel: (input: unknown) => Promise<NodeResult<UpdateChannel>>
  // Likewise for the network privacy.
  set_network_privacy: (input: unknown) => Promise<NodeResult<NetworkPrivacy>>
}

const read_stored_settings = async ({ file_path, log }: { file_path: string, log: (message: string) => void }): Promise<AppSettings> => {
  let text: string
  try {
    text = await readFile(file_path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') log(`settings store: cannot read ${file_path}: ${String(error)}`)
    return DEFAULT_SETTINGS
  }
  let stored: { update_channel?: unknown, network_privacy?: unknown }
  try {
    stored = JSON.parse(text) as typeof stored
  } catch (error) {
    log(`settings store: ignoring corrupt ${file_path}: ${String(error)}`)
    return DEFAULT_SETTINGS
  }
  // Each setting falls back alone, so a bad one never resets the other.
  if (!check_channel(stored.update_channel)) log(`settings store: ignoring a channel that is not stable or beta in ${file_path}`)
  if (stored.network_privacy !== undefined && !check_privacy(stored.network_privacy)) log(`settings store: ignoring a network privacy that is not public or masked in ${file_path}`)
  return {
    update_channel: check_channel(stored.update_channel) ? stored.update_channel : DEFAULT_SETTINGS.update_channel,
    network_privacy: check_privacy(stored.network_privacy) ? stored.network_privacy : DEFAULT_SETTINGS.network_privacy
  }
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

  // Each change applies to the settings as the previous save left them.
  const save = async (change: Partial<AppSettings>): Promise<void> => {
    const saved = saves.then(async () => { await write({ ...current, ...change }) })
    saves = saved.catch(() => {})
    await saved
  }

  return {
    get: () => current,
    set_channel: async (input) => {
      if (!check_channel(input)) return { ok: false, failure: { kind: 'refused', message: 'The update channel must be stable or beta.' } }
      await save({ update_channel: input })
      return { ok: true, data: input }
    },
    set_network_privacy: async (input) => {
      if (!check_privacy(input)) return { ok: false, failure: { kind: 'refused', message: 'The network privacy must be public or masked.' } }
      await save({ network_privacy: input })
      return { ok: true, data: input }
    }
  }
}
