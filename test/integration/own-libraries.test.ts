// Own-library management (spec §4.8.3, §8.9.1) against an in-process
// record-node: the identity's libraries with the listens library among
// them, create with a discriminator and about, a duplicate refused, retire,
// the listens library never retirable, and the identity events that tell
// the app to refetch.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { request_node } from '#main/node-client.ts'
import { open_node_events, type NodeEvents } from '#main/node-events.ts'
import { can_retire, has_profile, own_libraries_of, own_library_address } from '#renderer/components/library/library-category.ts'
import { tags_for_event } from '#renderer/store/event-invalidation.ts'
import type { About, Library } from '#renderer/api/types.ts'
import type { NodeEventMessage, NodeRequest, NodeResult } from '#shared/bridge.ts'
import { start_test_node, type TestNode } from './node-fixture.ts'

let node: TestNode
let events: NodeEvents
const messages: NodeEventMessage[] = []

const send = async (request: NodeRequest): Promise<NodeResult<unknown>> => await request_node({ node_url: node.node_url, request })
const call = async <T>(request: NodeRequest): Promise<T> => {
  const result = await send(request)
  if (!result.ok) throw new Error(`${request.method} ${request.path_template}: ${result.failure.message}`)
  return result.data as T
}
const own_libraries = async (): Promise<Library[]> => await call<Library[]>({ method: 'get', path_template: '/identity/libraries' })

const wait_for = async (condition: () => boolean, label: string): Promise<void> => {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error(`timed out waiting for ${label}`)
}

beforeAll(async () => {
  node = await start_test_node()
  events = open_node_events({ node_url: node.node_url, on_event: (message) => { messages.push(message) }, on_state: () => {} })
  await wait_for(() => events.get_state().status === 'open', 'events')
}, 120_000)

afterAll(async () => {
  events.close()
  await node.stop()
})

describe('own libraries', () => {
  test('the identity starts with its recordstore and its listens library', async () => {
    const libraries = await own_libraries()
    const types = libraries.map(({ library_type }) => library_type).sort()
    expect(types).toEqual(['listens', 'recordstore'])
    const listens = libraries.find(({ library_type }) => library_type === 'listens')
    if (listens === undefined) throw new Error('no listens library')
    expect(can_retire(listens)).toBe(false)
    expect(has_profile(listens)).toBe(false)
    expect(own_library_address(libraries)).toBe(libraries.find(({ library_type }) => library_type === 'recordstore')?.address ?? null)
  })

  test('without GET /identity/libraries the own libraries come from GET /libraries', async () => {
    const libraries = await call<Library[]>({ method: 'get', path_template: '/libraries' })
    const fallback = own_libraries_of({ own: undefined, libraries })
    expect(fallback.length).toBeGreaterThan(0)
    expect(fallback.every(({ is_own }) => is_own)).toBe(true)
    expect(own_libraries_of({ own: [], libraries })).toEqual([])
  })

  test('creates a library with a discriminator and about, and refuses the same discriminator again', async () => {
    const created = await call<Library>({ method: 'post', path_template: '/identity/libraries', body: { discriminator: 'mixes', about: { name: 'Mixes' } } })
    expect(created).toMatchObject({ is_own: true, is_retired: false, library_type: 'recordstore' })
    expect(created.address.endsWith('/mixes')).toBe(true)
    const about = await call<About>({ method: 'get', path_template: '/libraries/{address}/about', params: { address: created.address } })
    expect(about.name).toBe('Mixes')
    expect((await own_libraries()).map(({ address }) => address)).toContain(created.address)
    const duplicate = await send({ method: 'post', path_template: '/identity/libraries', body: { discriminator: 'mixes' } })
    expect(duplicate).toMatchObject({ ok: false, failure: { kind: 'http', status: 409 } })
    await wait_for(() => messages.some(({ type, payload }) => type === 'identity:library-created' && (payload.library as Library | undefined)?.address === created.address), 'identity:library-created')
    expect(tags_for_event('identity:library-created')).toContain('libraries')
    // A generated discriminator when none is given.
    const unnamed = await call<Library>({ method: 'post', path_template: '/identity/libraries' })
    expect(unnamed.address).not.toBe(created.address)
  })

  test('retires a library for good, and refuses to retire the listens library', async () => {
    const created = await call<Library>({ method: 'post', path_template: '/identity/libraries', body: { discriminator: 'old-stuff' } })
    expect(await send({ method: 'delete', path_template: '/identity/libraries/{address}', params: { address: created.address } })).toEqual({ ok: true, data: null })
    const retired = (await own_libraries()).find(({ address }) => address === created.address)
    expect(retired?.is_retired).toBe(true)
    if (retired === undefined) throw new Error('retired library missing')
    expect(can_retire(retired)).toBe(false)
    expect(has_profile(retired)).toBe(false)
    // The node refuses writes to it. It answers 409, but chapter 7 v1.1.1
    // declares no 409 on this route, so the fixture's response validation
    // turns it into a 500 (a follow-up on the record protocol v1.1 task).
    const write = await send({ method: 'post', path_template: '/libraries/{address}/about', params: { address: created.address }, body: { name: 'Again' } })
    expect(write.ok).toBe(false)
    await wait_for(() => messages.some(({ type, payload }) => type === 'identity:library-retired' && payload.library_address === created.address), 'identity:library-retired')
    expect(tags_for_event('identity:library-retired')).toContain('libraries')

    const listens = (await own_libraries()).find(({ library_type }) => library_type === 'listens')
    if (listens === undefined) throw new Error('no listens library')
    const refused = await send({ method: 'delete', path_template: '/identity/libraries/{address}', params: { address: listens.address } })
    expect(refused).toMatchObject({ ok: false, failure: { kind: 'http', status: 409 } })
  })
})
