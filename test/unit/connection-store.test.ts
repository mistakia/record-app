import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { open_connection_store } from '#main/connection-store.ts'

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

const temporary_file = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'record-app-connection-'))
  directories.push(directory)
  return join(directory, 'connection.json')
}

describe('connection store', () => {
  test('starts in remote mode with no node URL', async () => {
    const store = await open_connection_store({ file_path: await temporary_file() })
    expect(store.get()).toEqual({ mode: 'remote', node_url: null })
  })

  test('persists a valid config, normalized, readable only by the owner', async () => {
    const file_path = await temporary_file()
    const store = await open_connection_store({ file_path })
    expect(await store.save({ mode: 'remote', node_url: 'http://127.0.0.1:8088/' })).toEqual({ ok: true, data: { mode: 'remote', node_url: 'http://127.0.0.1:8088' } })
    expect(JSON.parse(await readFile(file_path, 'utf8'))).toEqual({ mode: 'remote', node_url: 'http://127.0.0.1:8088' })
    expect((await stat(file_path)).mode & 0o777).toBe(0o600)
    expect((await open_connection_store({ file_path })).get()).toEqual({ mode: 'remote', node_url: 'http://127.0.0.1:8088' })
  })

  test('refuses bundled mode, unknown modes, and invalid URLs without changing the saved config', async () => {
    const store = await open_connection_store({ file_path: await temporary_file() })
    for (const input of [
      { mode: 'bundled', node_url: null },
      { mode: 'hosted', node_url: 'http://127.0.0.1:3000' },
      { mode: 'remote', node_url: 'file:///etc/passwd' },
      { mode: 'remote' },
      null
    ]) {
      expect((await store.save(input)).ok).toBe(false)
    }
    expect(store.get()).toEqual({ mode: 'remote', node_url: null })
  })

  test('falls back to the default on a corrupt or invalid file', async () => {
    const file_path = await temporary_file()
    await writeFile(file_path, '{ not json')
    expect((await open_connection_store({ file_path })).get()).toEqual({ mode: 'remote', node_url: null })
    await writeFile(file_path, JSON.stringify({ mode: 'remote', node_url: 'javascript:alert(1)' }))
    expect((await open_connection_store({ file_path })).get()).toEqual({ mode: 'remote', node_url: null })
  })
})
