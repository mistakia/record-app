import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { open_settings_store } from '#main/settings-store.ts'

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

const temporary_file = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'record-app-settings-'))
  directories.push(directory)
  return join(directory, 'settings.json')
}

describe('settings store', () => {
  test('starts on the stable channel, the first-launch default (spec 8.2.5)', async () => {
    const store = await open_settings_store({ file_path: await temporary_file() })
    expect(store.get()).toEqual({ update_channel: 'stable' })
  })

  test('persists a chosen channel, readable only by the owner, and reads it back on reopen', async () => {
    const file_path = await temporary_file()
    const store = await open_settings_store({ file_path })
    expect(await store.set_channel('beta')).toEqual({ ok: true, data: 'beta' })
    expect(JSON.parse(await readFile(file_path, 'utf8'))).toEqual({ update_channel: 'beta' })
    expect((await stat(file_path)).mode & 0o777).toBe(0o600)
    expect((await open_settings_store({ file_path })).get()).toEqual({ update_channel: 'beta' })
  })

  test('refuses a channel that is not stable or beta without changing the saved setting', async () => {
    const store = await open_settings_store({ file_path: await temporary_file() })
    for (const input of ['canary', undefined, null, 42]) {
      expect((await store.set_channel(input)).ok).toBe(false)
    }
    expect(store.get()).toEqual({ update_channel: 'stable' })
  })

  test('falls back to the default on a corrupt or invalid file', async () => {
    const file_path = await temporary_file()
    const quiet = () => {}
    await writeFile(file_path, '{ not json')
    expect((await open_settings_store({ file_path, log: quiet })).get()).toEqual({ update_channel: 'stable' })
    await writeFile(file_path, JSON.stringify({ update_channel: 'nightly' }))
    expect((await open_settings_store({ file_path, log: quiet })).get()).toEqual({ update_channel: 'stable' })
  })
})

describe('settings store concurrency', () => {
  test('concurrent channel changes all land, the last one wins, and no temporary file is left', async () => {
    const file_path = await temporary_file()
    const store = await open_settings_store({ file_path })
    const channels = ['beta', 'stable', 'beta', 'stable', 'beta']
    const results = await Promise.all(channels.map(async (update_channel) => await store.set_channel(update_channel)))
    expect(results.every((result) => result.ok)).toBe(true)
    expect(store.get()).toEqual({ update_channel: 'beta' })
    expect(JSON.parse(await readFile(file_path, 'utf8')).update_channel).toBe('beta')
    expect(await Bun.file(`${file_path}.tmp`).exists()).toBe(false)
  })

  test('logs a corrupt or invalid file instead of reverting silently, and logs nothing when there is no file', async () => {
    const file_path = await temporary_file()
    const logged: string[] = []
    const log = (message: string) => { logged.push(message) }
    await open_settings_store({ file_path, log })
    expect(logged).toEqual([])
    await writeFile(file_path, '{ not json')
    await open_settings_store({ file_path, log })
    await writeFile(file_path, JSON.stringify({ update_channel: 'nightly' }))
    await open_settings_store({ file_path, log })
    expect(logged).toHaveLength(2)
    expect(logged[0]).toContain('corrupt')
    expect(logged[1]).toContain('is not stable or beta')
  })
})
