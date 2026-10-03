// Every write the browsing phase adds, against an in-process record-node
// with `cors_origins: []`: tags, file and URL import with their import:*
// events, adoption by CID, linking, connect and disconnect, the own
// library's about, identity export and import, and the reads beside them.
// Run with RECORD_TOOLCHAIN_PREFLIGHT=bypass where ffmpeg and fpcalc differ
// from record-node's pins.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { create_peer, start_peer, stop_peer, type Peer } from 'record-node'

import { open_connection_store } from '#main/connection-store.ts'
import { import_chosen_paths, import_dropped_files } from '#main/import-files.ts'
import { request_node } from '#main/node-client.ts'
import { open_node_events, type NodeEvents } from '#main/node-events.ts'
import { create_identity_access } from '#main/identity-access.ts'
import { serve_generic_request } from '#main/request-policy.ts'
import { URL_IMPORT_OFF_IN_BUNDLED } from '#shared/bundled.ts'
import { open_snapshot_store } from '#main/snapshot-store.ts'
import type { About, Library, Track, TrackList } from '#renderer/api/types.ts'
import type { NodeEventMessage, NodeRequest } from '#shared/bridge.ts'
import { start_test_node, type TestNode } from './node-fixture.ts'

let node: TestNode
let events: NodeEvents
let other: Peer
const messages: NodeEventMessage[] = []

const call = async <T>(request: NodeRequest): Promise<T> => {
  const result = await request_node({ node_url: node.node_url, request })
  if (!result.ok) throw new Error(`${request.method} ${request.path_template}: ${result.failure.message}`)
  return result.data as T
}

const wait_for = async (condition: () => boolean, label: string): Promise<void> => {
  for (let attempt = 0; attempt < 600; attempt++) {
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`timed out waiting for ${label}`)
}

const finished = async (import_id: string): Promise<NodeEventMessage[]> => {
  await wait_for(() => messages.some(({ type, payload }) => type === 'import:finished' && payload.import_id === import_id), `import ${import_id}`)
  return messages.filter(({ payload }) => payload.import_id === import_id)
}

const tracks = async (query: NodeRequest['query'] = {}): Promise<TrackList> =>
  await call<TrackList>({ method: 'get', path_template: '/tracks', query: { offset: 0, limit: 200, ...query } })

beforeAll(async () => {
  node = await start_test_node()
  events = open_node_events({ node_url: node.node_url, on_event: (message) => { messages.push(message) }, on_state: () => {} })
  await wait_for(() => events.get_state().status === 'open', 'events')
  await node.peer.ingest_file(node.make_audio({ name: 'Seed One.flac', seed: 1 }))
  other = await create_peer({ config: { network: false, allow_toolchain_mismatch: true } })
  await start_peer(other)
}, 120_000)

afterAll(async () => {
  events.close()
  await stop_peer(other)
  await node.stop()
})

describe('ingest', () => {
  test('files chosen in main upload from their paths, and the import:* events report the track', async () => {
    const ack = await import_chosen_paths({ node_url: node.node_url, paths: [node.make_audio({ name: 'Chosen Two.flac', seed: 2 })] })
    if (!ack.ok) throw new Error(ack.failure.message)
    const batch = await finished(ack.data.import_id)
    expect(batch.map(({ type }) => type)).toEqual(['import:starting', 'import:processed-file', 'import:finished'])
    expect(batch[1]?.payload.track).toMatchObject({ title: 'Chosen Two' })
  }, 60_000)

  test('dropped files upload from their bytes and bare names', async () => {
    const data = await readFile(node.make_audio({ name: 'Dropped Three.flac', seed: 3 }))
    const ack = await import_dropped_files({ node_url: node.node_url, input: [{ name: 'Dropped Three.flac', data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) }] })
    if (!ack.ok) throw new Error(ack.failure.message)
    expect((await finished(ack.data.import_id)).some(({ type }) => type === 'import:processed-file')).toBe(true)
  }, 60_000)

  test('a drop call over its total cap (2 GiB by default) is refused in main before any upload', async () => {
    const { MAX_DROP_CALL_BYTES } = await import('#main/import-files.ts')
    expect(MAX_DROP_CALL_BYTES).toBe(2 * 1024 ** 3)
    const part = new ArrayBuffer(600)
    const result = await import_dropped_files({ node_url: node.node_url, input: [{ name: 'a.flac', data: part }, { name: 'b.flac', data: part }], max_call_bytes: 1000 })
    expect(!result.ok && result.failure).toMatchObject({ kind: 'refused', message: expect.stringContaining('over 1000 bytes') })
  })

  test('drops and choices that are not audio files are refused before any upload', async () => {
    expect((await import_dropped_files({ node_url: node.node_url, input: [{ name: '../../etc/passwd', data: new ArrayBuffer(4) }] })).ok).toBe(false)
    expect((await import_dropped_files({ node_url: node.node_url, input: 'not a list' })).ok).toBe(false)
    expect((await import_chosen_paths({ node_url: node.node_url, paths: ['/etc/hosts'] })).ok).toBe(false)
  })

  test('URL import resolves, downloads, and ingests', async () => {
    const ack = await call<{ import_id: string }>({ method: 'post', path_template: '/import/url', body: { url: 'https://example.test/a-track' } })
    expect((await finished(ack.import_id)).some(({ type }) => type === 'import:processed-file')).toBe(true)
    expect((await tracks()).total).toBe(4)
  }, 60_000)

  test('adopting a track by content CID answers with the track', async () => {
    const [existing] = (await tracks()).items
    if (existing === undefined) throw new Error('no track')
    const adopted = await call<Track>({ method: 'post', path_template: '/tracks', body: { content_cid: existing.content_cid } })
    expect(adopted.id).toBe(existing.id)
  })
})

describe('tags', () => {
  test('add, filter by, count, and remove a tag on an own-library track', async () => {
    const [track] = (await tracks()).items
    if (track === undefined) throw new Error('no track')
    const tagged = await call<Track>({ method: 'post', path_template: '/tags', body: { track_id: track.id, tag: 'smoke tag' } })
    expect(tagged.tags.map(({ tag }) => tag)).toContain('smoke tag')
    expect(await call<Array<{ tag: string, count: number }>>({ method: 'get', path_template: '/tags' })).toContainEqual({ tag: 'smoke tag', count: 1 })
    const filtered = await tracks({ tags: ['smoke tag'] })
    expect(filtered.items.map(({ id }) => id)).toEqual([track.id])
    const untagged = await call<Track>({ method: 'delete', path_template: '/tags', query: { track_id: track.id, tag: 'smoke tag' } })
    expect(untagged.tags).toHaveLength(0)
    expect((await tracks({ tags: ['smoke tag'] })).total).toBe(0)
  })

  test('search and sort are answered by the node', async () => {
    expect((await tracks({ query: 'Chosen' })).items.map(({ title }) => title)).toEqual(['Chosen Two'])
    // The URL import has no title; the node sorts untitled tracks last.
    const by_title = (await tracks({ sort: 'title', order: 'asc' })).items.map(({ title }) => title)
    const titled = by_title.filter((title): title is string => title != null)
    expect(by_title.slice(0, titled.length)).toEqual([...titled].sort((a, b) => a.localeCompare(b)))
  })
})

describe('libraries', () => {
  test('link another library (shown as replicating), connect, disconnect, and unlink it', async () => {
    const address = other.identity().own_address
    const linked = await call<Library>({ method: 'post', path_template: '/libraries', body: { library_address: address, alias: 'Other' } })
    expect(linked).toMatchObject({ address, is_linked: true, is_own: false })
    const listed = await call<Library[]>({ method: 'get', path_template: '/libraries' })
    expect(listed.find((library) => library.address === address)).toMatchObject({ alias: 'Other', is_linked: true })
    await call({ method: 'post', path_template: '/libraries/{address}/disconnect', params: { address } })
    await call({ method: 'post', path_template: '/libraries/{address}/connect', params: { address } })
    await call({ method: 'delete', path_template: '/libraries/{address}', params: { address } })
    const after = await call<Library[]>({ method: 'get', path_template: '/libraries' })
    expect(after.some((library) => library.address === address && library.is_linked)).toBe(false)
  })

  test('the own library\'s about can be read and edited', async () => {
    const address = node.peer.identity().own_address
    const updated = await call<About>({ method: 'post', path_template: '/libraries/{address}/about', params: { address }, body: { name: 'Smoke Own', bio: 'A test library', location: null } })
    expect(updated).toMatchObject({ name: 'Smoke Own', bio: 'A test library' })
    expect(await call<About>({ method: 'get', path_template: '/libraries/{address}/about', params: { address } })).toMatchObject({ name: 'Smoke Own' })
  })
})

describe('identity', () => {
  test('export returns the key pair, and importing that key keeps the same identity', async () => {
    const exported = await call<{ public_key: string, private_key: string }>({ method: 'get', path_template: '/identity/export' })
    expect(exported.private_key).toMatch(/^[0-9a-f]+$/)
    const imported = await call<{ public_key: string, own_library_address: string }>({ method: 'post', path_template: '/identity/import', body: { private_key: exported.private_key } })
    expect(imported).toMatchObject({ public_key: exported.public_key, own_library_address: node.peer.identity().own_address })
  })

  test('the generic request channel refuses both identity routes', async () => {
    for (const input of [{ method: 'get', path_template: '/identity/export' }, { method: 'post', path_template: '/identity/import', body: { private_key: 'ab' } }]) {
      const result = await serve_generic_request({ input, node_url: node.node_url, mode: 'remote' })
      expect(!result.ok && result.failure.kind).toBe('refused')
    }
    expect((await serve_generic_request({ input: { method: 'get', path_template: '/settings' }, node_url: node.node_url, mode: 'remote' })).ok).toBe(true)
  })

  test('the generic request channel refuses URL import in bundled mode, before the node sees it', async () => {
    const input = { method: 'post', path_template: '/import/url', body: { url: 'https://example.test/track' } }
    let calls = 0
    const call = async () => { calls++; return { ok: true as const, data: null } }
    const bundled = await serve_generic_request({ input, node_url: node.node_url, mode: 'bundled', call })
    expect(!bundled.ok && bundled.failure).toEqual({ kind: 'refused', message: URL_IMPORT_OFF_IN_BUNDLED })
    expect(calls).toBe(0)
    expect((await serve_generic_request({ input, node_url: node.node_url, mode: 'remote', call })).ok).toBe(true)
    expect(calls).toBe(1)
  })

  test('main\'s identity channel returns the key only after the user confirms, and imports only into a bundled node', async () => {
    const asked: Array<{ node_url: string, cleartext: boolean }> = []
    let answer = false
    let mode: 'remote' | 'bundled' = 'remote'
    const identity = create_identity_access({
      get_connection: () => ({ mode, node_url: node.node_url }),
      confirm_export: async (input) => { asked.push(input); return answer }
    })
    expect(await identity.export_identity()).toMatchObject({ ok: false, failure: { kind: 'aborted' } })
    answer = true
    const exported = await identity.export_identity()
    if (!exported.ok) throw new Error(exported.failure.message)
    expect(asked).toEqual([{ node_url: node.node_url, cleartext: false }, { node_url: node.node_url, cleartext: false }])
    expect(await identity.import_identity({ private_key: exported.data.private_key })).toMatchObject({ ok: false, failure: { kind: 'refused' } })
    mode = 'bundled'
    expect(await identity.import_identity({ private_key: 'not hex' })).toMatchObject({ ok: false, failure: { kind: 'refused' } })
    expect(await identity.import_identity({ private_key: exported.data.private_key })).toMatchObject({ ok: true, data: { public_key: exported.data.public_key } })
  })

  test('an export through main leaves no trace in any file main writes', async () => {
    const user_data = join(node.work_dir, 'user-data')
    const store = await open_connection_store({ file_path: join(user_data, 'connection.json') })
    await store.save({ mode: 'remote', node_url: node.node_url })
    const snapshots = await open_snapshot_store({ snapshot_path: join(user_data, 'snapshot.json'), settings_path: join(user_data, 'snapshot-settings.json') })
    const exported = await call<{ private_key: string }>({ method: 'get', path_template: '/identity/export' })
    const libraries = await call<Library[]>({ method: 'get', path_template: '/libraries' })
    snapshots.update({ snapshot: { version: 1, node_key: node.node_url, written_at_ms: 1, route: '/identity', libraries: libraries as unknown as Array<Record<string, unknown>>, active: null, queue: null }, node_key: node.node_url })
    await snapshots.flush()
    snapshots.flush_sync()
    const files = await readdir(user_data)
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) expect(await readFile(join(user_data, file), 'utf8')).not.toContain(exported.private_key)
  })
})

describe('reads', () => {
  test('listen history and peers', async () => {
    const [track] = (await tracks()).items
    if (track === undefined) throw new Error('no track')
    await call({ method: 'post', path_template: '/listens', body: { track_id: track.id, library_address: node.peer.identity().own_address } })
    const listens = await call<TrackList>({ method: 'get', path_template: '/listens', query: { offset: 0, limit: 10 } })
    expect(listens.items[0]).toMatchObject({ id: track.id })
    expect(await call<unknown[]>({ method: 'get', path_template: '/peers' })).toEqual([])
  })
})
