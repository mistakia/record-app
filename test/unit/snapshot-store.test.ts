import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { fit_snapshot, open_snapshot_store } from '#main/snapshot-store.ts'
import { DEFAULT_SNAPSHOT_BUDGET_BYTES, MAX_SNAPSHOT_BUDGET_BYTES, type HibernationSnapshot, type SnapshotTrack } from '#shared/snapshot.ts'

const NODE_URL = 'http://127.0.0.1:3000'
const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

const open_store = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'record-app-snapshot-'))
  directories.push(directory)
  const paths = { snapshot_path: join(directory, 'snapshot.json'), settings_path: join(directory, 'snapshot-settings.json') }
  const logged: string[] = []
  const open = async () => await open_snapshot_store({ ...paths, log: (message) => { logged.push(message) } })
  return { ...paths, open, logged, store: await open() }
}

const track = (index: number): SnapshotTrack => ({
  id: String(index).padStart(64, '0'),
  content_cid: `content${index}`,
  audio_cid: `audio${index}`,
  audio_size_bytes: 1000,
  title: `Track ${index}`,
  artist: 'Artist',
  album: null,
  duration_seconds: 120,
  tags: [],
  listen_count: 0,
  have_track: true
})

const snapshot = (overrides: Partial<HibernationSnapshot> = {}): HibernationSnapshot => ({
  version: 1,
  node_url: NODE_URL,
  written_at_ms: 1,
  route: '/tracks',
  libraries: [{ address: '/record/a/record', name: 'Own', is_own: true }],
  active: { library_address: '', total: 200, tracks: Array.from({ length: 200 }, (_, index) => track(index)) },
  queue: { entries: [{ track_id: 'x', audio_cid: 'audio0', title: 'Track 0', artist: 'Artist' }], index: 0, position_seconds: 12 },
  ...overrides
})

describe('fit_snapshot', () => {
  test('evicts the track page, then the queue, and never the library list', () => {
    const full = snapshot()
    const full_size = Buffer.byteLength(JSON.stringify(full))
    expect(JSON.parse(fit_snapshot({ snapshot: full, budget_bytes: full_size }))).toEqual(full)
    const without_tracks = JSON.parse(fit_snapshot({ snapshot: full, budget_bytes: full_size - 1 })) as HibernationSnapshot
    expect(without_tracks.active).toBeNull()
    expect(without_tracks.queue).not.toBeNull()
    const minimal = JSON.parse(fit_snapshot({ snapshot: full, budget_bytes: 10 })) as HibernationSnapshot
    expect(minimal).toMatchObject({ active: null, queue: null, libraries: full.libraries, route: '/tracks' })
  })
})

describe('snapshot store', () => {
  test('keeps updates in memory until a flush, then loads them for the same node only', async () => {
    const { store, snapshot_path, open } = await open_store()
    expect(store.get_info()).toEqual({ size_bytes: 0, budget_bytes: DEFAULT_SNAPSHOT_BUDGET_BYTES })
    expect(store.update({ snapshot: snapshot(), node_url: NODE_URL }).ok).toBe(true)
    expect(await store.load(NODE_URL)).toBeNull()
    await store.flush()
    expect(store.get_info().size_bytes).toBe(Buffer.byteLength(await readFile(snapshot_path)))
    expect(await store.load(NODE_URL)).toEqual(snapshot())
    expect(await store.load('http://127.0.0.1:3001')).toBeNull()
    expect(await (await open()).load(NODE_URL)).toEqual(snapshot())
  })

  test('refuses malformed snapshots and snapshots of another node', async () => {
    const { store } = await open_store()
    for (const input of [null, {}, { ...snapshot(), version: 2 }, { ...snapshot(), route: 'tracks' }, { ...snapshot(), libraries: 'x' }]) {
      expect(store.update({ snapshot: input, node_url: NODE_URL }).ok).toBe(false)
    }
    expect(store.update({ snapshot: snapshot(), node_url: 'http://127.0.0.1:3001' }).ok).toBe(false)
  })

  test('flush_sync writes the pending snapshot, and wipe removes it', async () => {
    const { store, snapshot_path } = await open_store()
    store.update({ snapshot: snapshot(), node_url: NODE_URL })
    store.flush_sync()
    expect(JSON.parse(await readFile(snapshot_path, 'utf8'))).toEqual(snapshot())
    await store.wipe()
    expect(await Bun.file(snapshot_path).exists()).toBe(false)
    expect(store.get_info().size_bytes).toBe(0)
    await store.flush()
    expect(await Bun.file(snapshot_path).exists()).toBe(false)
  })

  test('budget: validated, persisted, 0 disables and wipes, and a smaller one refits the file', async () => {
    const { store, snapshot_path, open } = await open_store()
    for (const budget_bytes of [-1, 1.5, MAX_SNAPSHOT_BUDGET_BYTES + 1, Number.NaN]) {
      expect((await store.set_budget({ budget_bytes })).ok).toBe(false)
    }
    store.update({ snapshot: snapshot(), node_url: NODE_URL })
    await store.flush()
    const result = await store.set_budget({ budget_bytes: 2000 })
    expect(result.ok && result.data.budget_bytes).toBe(2000)
    expect((JSON.parse(await readFile(snapshot_path, 'utf8')) as HibernationSnapshot).active).toBeNull()
    expect((await open()).get_info().budget_bytes).toBe(2000)

    await store.set_budget({ budget_bytes: 0 })
    expect(await Bun.file(snapshot_path).exists()).toBe(false)
    store.update({ snapshot: snapshot(), node_url: NODE_URL })
    await store.flush()
    expect(await Bun.file(snapshot_path).exists()).toBe(false)
    expect(await store.load(NODE_URL)).toBeNull()
  })

  test('logs an unreadable snapshot file and loads nothing', async () => {
    const { store, snapshot_path, logged } = await open_store()
    await writeFile(snapshot_path, '{ broken')
    expect(await store.load(NODE_URL)).toBeNull()
    expect(logged).toHaveLength(1)
  })
})
