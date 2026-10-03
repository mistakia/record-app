// Writes with a target library (chapter 7 write targets, spec §8.6.3) against
// an in-process record-node whose identity owns two recordstores: without a
// target a write is refused, and tags, file import, and adoption by content
// CID land in the library named.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { check_import_target, import_chosen_paths } from '#main/import-files.ts'
import { request_node } from '#main/node-client.ts'
import { write_targets } from '#renderer/library/write-targets.ts'
import type { Library, Track, TrackList } from '#renderer/api/types.ts'
import type { NodeRequest, NodeResult } from '#shared/bridge.ts'
import { start_test_node, type TestNode } from './node-fixture.ts'

let node: TestNode
let first: string
let second: string

const send = async (request: NodeRequest): Promise<NodeResult<unknown>> => await request_node({ node_url: node.node_url, request })
const call = async <T>(request: NodeRequest): Promise<T> => {
  const result = await send(request)
  if (!result.ok) throw new Error(`${request.method} ${request.path_template}: ${result.failure.message}`)
  return result.data as T
}
const tracks_in = async (library_address: string): Promise<Track[]> =>
  (await call<TrackList>({ method: 'get', path_template: '/tracks', query: { offset: 0, limit: 50, library_addresses: [library_address] } })).items

const wait_for = async (condition: () => Promise<boolean>, label: string): Promise<void> => {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await condition()) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`timed out waiting for ${label}`)
}

beforeAll(async () => {
  node = await start_test_node()
  await node.peer.ingest_file(node.make_audio({ name: 'Target Seed.flac', seed: 21 }))
  first = node.peer.identity().own_address
  second = (await call<Library>({ method: 'post', path_template: '/identity/libraries', body: { discriminator: 'second', about: { name: 'Second' } } })).address
}, 120_000)

afterAll(async () => { await node.stop() })

describe('write targets', () => {
  test('both own recordstores are targets, and a write without one is refused', async () => {
    const libraries = await call<Library[]>({ method: 'get', path_template: '/libraries' })
    expect(write_targets({ libraries, held: [], action: 'library.append_track' }).map(({ library_address }) => library_address).sort()).toEqual([first, second].sort())
    const [seed] = await tracks_in(first)
    if (seed === undefined) throw new Error('no seed track')
    expect(await send({ method: 'post', path_template: '/tags', body: { track_id: seed.id, tag: 'untargeted' } })).toMatchObject({ ok: false, failure: { status: 400 } })
  })

  test('adopts a track into the second library by content CID, then tags and untags it there', async () => {
    const [seed] = await tracks_in(first)
    if (seed === undefined) throw new Error('no seed track')
    await call<Track>({ method: 'post', path_template: '/tracks', body: { content_cid: seed.content_cid, library_address: second } })
    expect((await tracks_in(second)).map(({ id }) => id)).toContain(seed.id)
    const tagged = await call<Track>({ method: 'post', path_template: '/tags', body: { track_id: seed.id, tag: 'second-only', library_address: second } })
    expect(tagged.tags).toContainEqual({ library_address: second, tag: 'second-only' })
    const untagged = await call<Track>({ method: 'delete', path_template: '/tags', query: { track_id: seed.id, tag: 'second-only', library_address: second } })
    expect(untagged.tags.some(({ tag }) => tag === 'second-only')).toBe(false)
  })

  test('file import lands in the library named', async () => {
    const checked = check_import_target({ library_address: second })
    if (!checked.ok) throw new Error('target refused')
    const ack = await import_chosen_paths({ node_url: node.node_url, paths: [node.make_audio({ name: 'Into Second.flac', seed: 22 })], target: checked.target })
    expect(ack.ok).toBe(true)
    await wait_for(async () => (await tracks_in(second)).some(({ title }) => title === 'Into Second'), 'import into the second library')
    expect((await tracks_in(first)).some(({ title }) => title === 'Into Second')).toBe(false)
  }, 30_000)

  test('main refuses a malformed import target', () => {
    for (const bad of ['x', [], { library_address: 3 }, { library_address: 'has space' }, { library_address: '/ok', capability_id: '' }]) {
      expect(check_import_target(bad).ok).toBe(false)
    }
    expect(check_import_target(undefined)).toEqual({ ok: true, target: undefined })
  })
})
