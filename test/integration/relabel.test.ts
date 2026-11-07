// The Tags page's relabel job against an in-process record-node: rename,
// merge, delete and facet prefix rename as label-record writes to the
// labels library and an own recordstore, a track removed mid-job, a
// node-managed library left untouched, and a re-run after a cancel. Run
// with RECORD_TOOLCHAIN_PREFLIGHT=bypass where ffmpeg and fpcalc differ
// from record-node's pins.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { request_node } from '#main/node-client.ts'
import type { Library, TagCount, Track, TrackList } from '#renderer/api/types.ts'
import type { LabelBatch } from '#renderer/store/relabel-batches.ts'
import { prefix_mappings, type LabelMapping } from '#renderer/store/relabel-plan.ts'
import { label_holding_libraries, label_write_libraries, run_relabel, type Outcome, type RelabelPorts } from '#renderer/store/relabel-run.ts'
import type { NodeRequest } from '#shared/bridge.ts'
import { start_test_node, type TestNode } from './node-fixture.ts'

let node: TestNode
const managed = new Map<string, string>()
let labels_address: string
let store_address: string
let facets_address: string
const ids: string[] = []

const send = async <T>(request: NodeRequest): Promise<Outcome<T>> => await request_node({ node_url: node.node_url, request }) as Outcome<T>

const call = async <T>(request: NodeRequest): Promise<T> => {
  const result = await send<T>(request)
  if (!result.ok) throw new Error(`${request.method} ${request.path_template}: ${result.failure.message}`)
  return result.data
}

const batch = (library_address: string, items: Array<{ track_id: string, add?: string[], remove?: string[] }>) =>
  call<unknown>({ method: 'post', path_template: '/tags/batch', body: { items, library_address } })

// A library's label state, held track ids or not: track id -> labels.
const label_state = async (library_address: string): Promise<Map<string, string[]>> => {
  const state = new Map<string, string[]>()
  for (let offset = 0; ; offset += 500) {
    const page = await call<{ items: Array<{ track_id: string, tags: string[] }>, total: number }>({ method: 'get', path_template: '/libraries/{address}/labels', params: { address: library_address }, query: { offset, limit: 500 } })
    for (const { track_id, tags } of page.items) state.set(track_id, [...tags].sort())
    if (offset + 500 >= page.total) return state
  }
}

const ports = (overrides: Partial<RelabelPorts> = {}): RelabelPorts & { batches: LabelBatch[] } => {
  const batches: LabelBatch[] = []
  return {
    batches,
    fetch_page: async (args) => await send<TrackList>({ method: 'get', path_template: '/tracks', query: { ...args } }),
    write_batch: async (each) => {
      batches.push(each)
      return await send({ method: 'post', path_template: '/tags/batch', body: { items: each.items, library_address: each.library_address, ...(each.capability_id === null ? {} : { capability_id: each.capability_id }) } })
    },
    count_tags: async (args) => await send<TagCount[]>({ method: 'get', path_template: '/tags', query: { ...args } }),
    cancelled: () => false,
    progress: () => {},
    ...overrides
  }
}

const relabel = async (mappings: LabelMapping[], port_overrides: Partial<RelabelPorts> = {}) => {
  const [own, libraries] = await Promise.all([
    call<Library[]>({ method: 'get', path_template: '/identity/libraries' }),
    call<Library[]>({ method: 'get', path_template: '/libraries' })
  ])
  const these = ports(port_overrides)
  const report = await run_relabel({ mappings, managed: new Set(), targets: label_write_libraries({ own, libraries, held: [] }), known_libraries: label_holding_libraries({ own, libraries }), held: [], ports: these })
  return { report, batches: these.batches }
}

beforeAll(async () => {
  node = await start_test_node({ managed_label_libraries: managed })
  for (let seed = 1; seed <= 4; seed++) await node.peer.ingest_file(node.make_audio({ name: `Relabel ${seed}.flac`, seed: 40 + seed }))
  const own = await call<Library[]>({ method: 'get', path_template: '/identity/libraries' })
  labels_address = own.find(({ library_type }) => library_type === 'labels')!.address
  store_address = (await call<{ own_library_address: string }>({ method: 'get', path_template: '/identity' })).own_library_address
  const tracks = await call<TrackList>({ method: 'get', path_template: '/tracks', query: { offset: 0, limit: 10, sort: 'title', order: 'asc' } })
  ids.push(...tracks.items.map(({ id }) => id))
  const facets = await call<Library>({ method: 'post', path_template: '/identity/libraries', body: { name: 'Facets' } })
  facets_address = facets.address
  const first = tracks.items[0] as Track
  await call<unknown>({ method: 'post', path_template: '/tracks', body: { content_cid: first.content_cid, library_address: facets_address } })
  await batch(labels_address, [
    { track_id: ids[0]!, add: ['old', 'a'] },
    { track_id: ids[1]!, add: ['a', 'b', 'gone'] },
    { track_id: ids[2]!, add: ['mix/x', 'mix/y'] },
    { track_id: ids[3]!, add: ['old'] }
  ])
  await batch(store_address, [{ track_id: ids[0]!, add: ['old'] }])
  await batch(facets_address, [{ track_id: ids[0]!, add: ['old'] }])
  // From here on only the exporter's token may write the Facets library.
  managed.set(facets_address, 'exporter0001')
}, 180_000)

afterAll(async () => {
  await node.stop()
})

describe('relabel against the node', () => {
  test('a rename changes the labels library and an own recordstore, relabels a track removed mid-job, and leaves the managed library', async () => {
    let removed = false
    const write = ports().write_batch
    const { report } = await relabel([{ from_label: 'old', to_label: 'new' }], {
      // Collected; now the track leaves its library before the first write.
      write_batch: async (each) => {
        if (!removed) {
          removed = true
          await call<unknown>({ method: 'delete', path_template: '/tracks/{id}', params: { id: ids[3]! }, query: { library_address: store_address } })
        }
        return await write(each)
      }
    })
    expect(report).toMatchObject({ status: 'finished', failed: [], skipped: [{ library_address: facets_address, reason: 'managed' }] })
    const labels = await label_state(labels_address)
    expect(labels.get(ids[0]!)).toEqual(['a', 'new'])
    expect(labels.get(ids[3]!)).toEqual(['new'])
    expect([...labels.values()].some((tags) => tags.includes('old'))).toBe(false)
    expect((await label_state(store_address)).get(ids[0]!)).toEqual(['new'])
    expect((await label_state(facets_address)).get(ids[0]!)).toEqual(['old'])
    // What stays is the managed copy, counted exactly.
    expect(report.remaining).toBe(1)
  }, 60_000)

  test('the managed library\'s labels read as managed, and a direct batch to it is refused', async () => {
    expect(await call<TagCount[]>({ method: 'get', path_template: '/tags', query: { label_libraries: [facets_address] } })).toEqual([{ tag: 'old', count: 1, managed: true }])
    const refused = await send({ method: 'post', path_template: '/tags/batch', body: { items: [{ track_id: ids[0]!, remove: ['old'] }], library_address: facets_address } })
    expect(refused).toMatchObject({ ok: false, failure: { kind: 'http', status: 403 } })
  })

  test('a merge where one track holds both sources is one item for that track', async () => {
    const { report, batches } = await relabel([{ from_label: 'a', to_label: 'ab' }, { from_label: 'b', to_label: 'ab' }])
    expect(report.status).toBe('finished')
    const items = batches.flatMap(({ items: each }) => each).filter(({ track_id }) => track_id === ids[1])
    expect(items).toEqual([{ track_id: ids[1]!, add: ['ab'], remove: ['a', 'b'] }])
    const labels = await label_state(labels_address)
    expect(labels.get(ids[0]!)).toEqual(['ab', 'new'])
    expect(labels.get(ids[1]!)).toEqual(['ab', 'gone'])
  }, 60_000)

  test('a delete removes the label', async () => {
    const { report } = await relabel([{ from_label: 'gone', to_label: null }])
    expect(report).toMatchObject({ status: 'finished', updated: 1, remaining: 0 })
    expect((await label_state(labels_address)).get(ids[1]!)).toEqual(['ab'])
  }, 60_000)

  test('a facet prefix rename moves every label under it', async () => {
    const { report } = await relabel(prefix_mappings({ labels: ['mix/x', 'mix/y'], from_prefix: 'mix', to_prefix: 'set' }))
    expect(report).toMatchObject({ status: 'finished', updated: 1, remaining: 0 })
    expect((await label_state(labels_address)).get(ids[2]!)).toEqual(['set/x', 'set/y'])
  }, 60_000)

  test('a re-run after a cancel finishes the rest, and another changes nothing', async () => {
    await batch(labels_address, [{ track_id: ids[0]!, add: ['c1'] }, { track_id: ids[1]!, add: ['c1'] }])
    await batch(store_address, [{ track_id: ids[0]!, add: ['c1'] }])
    let written = 0
    const first = await relabel([{ from_label: 'c1', to_label: 'c2' }], {
      cancelled: () => written >= 1,
      progress: (update) => { if (update.written !== undefined) written = update.written }
    })
    expect(first.report.status).toBe('cancelled')
    const second = await relabel([{ from_label: 'c1', to_label: 'c2' }])
    expect(second.report).toMatchObject({ status: 'finished', failed: [], remaining: 0 })
    expect(second.report.updated).toBeGreaterThan(0)
    const third = await relabel([{ from_label: 'c1', to_label: 'c2' }])
    expect(third.report).toMatchObject({ status: 'finished', total: 0, updated: 0 })
    for (const address of [labels_address, store_address]) {
      expect([...(await label_state(address)).values()].some((tags) => tags.includes('c1'))).toBe(false)
    }
  }, 60_000)
})
