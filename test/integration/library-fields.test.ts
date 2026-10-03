// Track.library_addresses and Library.audio_size_bytes (record-docs v1.1.3)
// against an in-process record-node whose identity owns two recordstores:
// a track lists the libraries holding it among those a request covers, a
// library's audio size is the sum of its tracks', and removing a track from
// one own library leaves the other holding it. main refuses a removal that
// names no library.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { serve_generic_request } from '#main/request-policy.ts'
import { refused_without_target } from '#main/write-target.ts'
import { request_node } from '#main/node-client.ts'
import type { Library, Track, TrackList } from '#renderer/api/types.ts'
import type { NodeRequest } from '#shared/bridge.ts'
import { start_test_node, type TestNode } from './node-fixture.ts'

let node: TestNode
let first: string
let second: string
let seed: Track

const call = async <T>(request: NodeRequest): Promise<T> => {
  const result = await request_node({ node_url: node.node_url, request })
  if (!result.ok) throw new Error(`${request.method} ${request.path_template}: ${result.failure.message}`)
  return result.data as T
}
const tracks = async (library_addresses?: string[]): Promise<Track[]> =>
  (await call<TrackList>({ method: 'get', path_template: '/tracks', query: { offset: 0, limit: 50, ...(library_addresses === undefined ? {} : { library_addresses }) } })).items
const holders_of = async (track_id: string, library_addresses?: string[]): Promise<string[] | undefined> =>
  (await tracks(library_addresses)).find(({ id }) => id === track_id)?.library_addresses?.toSorted()

beforeAll(async () => {
  node = await start_test_node()
  await node.peer.ingest_file(node.make_audio({ name: 'Fields Seed.flac', seed: 31 }))
  await node.peer.ingest_file(node.make_audio({ name: 'Fields Other.flac', seed: 32, seconds: 9 }))
  first = node.peer.identity().own_address
  second = (await call<Library>({ method: 'post', path_template: '/identity/libraries', body: { discriminator: 'fields', about: { name: 'Fields' } } })).address
  const found = (await tracks([first])).find(({ title }) => title === 'Fields Seed')
  if (found === undefined) throw new Error('no seed track')
  seed = found
  await call<Track>({ method: 'post', path_template: '/tracks', body: { content_cid: seed.content_cid, library_address: second } })
}, 120_000)

afterAll(async () => { await node.stop() })

describe('library fields', () => {
  // The holders are those among the libraries the request covers: the
  // library_addresses filter when given, else every library.
  test('a track lists the libraries holding it, in aggregated and filtered views', async () => {
    const both = [first, second].toSorted()
    expect(await holders_of(seed.id)).toEqual(both)
    expect(await holders_of(seed.id, [first, second])).toEqual(both)
    expect(await holders_of(seed.id, [second])).toEqual([second])
    const other = (await tracks()).find(({ title }) => title === 'Fields Other')
    expect(other?.library_addresses).toEqual([first])
  })

  test('a library\'s audio size is the sum of its tracks\' audio sizes', async () => {
    const libraries = await call<Library[]>({ method: 'get', path_template: '/libraries' })
    for (const address of [first, second]) {
      const library = libraries.find((candidate) => candidate.address === address)
      const sum = (await tracks([address])).reduce((total, track) => total + track.audio_size_bytes, 0)
      expect(sum).toBeGreaterThan(0)
      expect(library?.audio_size_bytes).toBe(sum)
    }
  })

  test('removing a track from one own library leaves the other holding it', async () => {
    await call<unknown>({ method: 'delete', path_template: '/tracks/{id}', params: { id: seed.id }, query: { library_address: second } })
    expect((await tracks([second])).some(({ id }) => id === seed.id)).toBe(false)
    expect(await holders_of(seed.id)).toEqual([first])
    const libraries = await call<Library[]>({ method: 'get', path_template: '/libraries' })
    expect(libraries.find(({ address }) => address === second)?.audio_size_bytes).toBe(0)
  })

  test('main refuses a removal that names no library', async () => {
    const untargeted: NodeRequest = { method: 'delete', path_template: '/tracks/{id}', params: { id: seed.id } }
    expect(refused_without_target(untargeted)).not.toBeNull()
    expect(refused_without_target({ ...untargeted, query: { library_address: first } })).toBeNull()
    expect(await serve_generic_request({ input: untargeted, node_url: node.node_url, mode: 'remote' })).toMatchObject({ ok: false, failure: { kind: 'refused' } })
    expect(await holders_of(seed.id)).toEqual([first])
  })
})
