// Capability management (spec §8.6.4) against an in-process record-node:
// issue a filtered, expiring capability on the own library, see it listed
// active, revoke it and see it revoked; the node refuses an unknown action;
// a capability granted to the identity's own key appears among the held
// ones the node lists (the Identity page then leaves out own libraries).

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { request_node } from '#main/node-client.ts'
import { open_node_events, type NodeEvents } from '#main/node-events.ts'
import { filter_problems } from '#renderer/filter/filter-spec.ts'
import { describe_scope, parse_grantee_keys } from '#renderer/library/capabilities.ts'
import { tags_for_event } from '#renderer/store/event-invalidation.ts'
import type { Capability } from '#renderer/api/types.ts'
import type { NodeEventMessage, NodeRequest, NodeResult } from '#shared/bridge.ts'
import { start_test_node, type TestNode } from './node-fixture.ts'

let node: TestNode
let events: NodeEvents
let own: string
const messages: NodeEventMessage[] = []
// Compressed secp256k1 points G, 2G, and 3G: valid keys no one here holds.
const GRANTEE_KEYS = [
  '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
  '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9'
]
let next_key = 0
const new_key = (): string => GRANTEE_KEYS[next_key++ % GRANTEE_KEYS.length] as string

const send = async (request: NodeRequest): Promise<NodeResult<unknown>> => await request_node({ node_url: node.node_url, request })
const call = async <T>(request: NodeRequest): Promise<T> => {
  const result = await send(request)
  if (!result.ok) throw new Error(`${request.method} ${request.path_template}: ${result.failure.message}`)
  return result.data as T
}
const list = async (): Promise<Capability[]> => await call<Capability[]>({ method: 'get', path_template: '/libraries/{address}/capabilities', params: { address: own } })

const wait_for = async (condition: () => boolean, label: string): Promise<void> => {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error(`timed out waiting for ${label}`)
}

beforeAll(async () => {
  node = await start_test_node()
  own = node.peer.identity().own_address
  events = open_node_events({ node_url: node.node_url, on_event: (message) => { messages.push(message) }, on_state: () => {} })
  await wait_for(() => events.get_state().status === 'open', 'events')
}, 120_000)

afterAll(async () => {
  events.close()
  await node.stop()
})

describe('capabilities', () => {
  test('issues a filtered, expiring capability, lists it active, and revokes it', async () => {
    const grantee = parse_grantee_keys(new_key())
    if (!grantee.ok) throw new Error(grantee.reason)
    const filter = { type: 'any_of', field: 'tags', values: ['house', 'techno'] }
    expect(filter_problems(filter)).toEqual([])
    const expires_at = Date.now() + 3_600_000
    const issued = await call<Capability>({
      method: 'post',
      path_template: '/libraries/{address}/capabilities',
      params: { address: own },
      body: { grantee: grantee.grantee, actions: ['library.append_tag'], filter, conditions: [{ type: 'expires_at', at: expires_at }] }
    })
    expect(issued).toMatchObject({ status: 'active', library_address: own, actions: ['library.append_tag'], filter, expires_at_ms: expires_at })
    expect(describe_scope(issued)).toContain('Add tags; only tags is any of "house", "techno"; expires')
    expect((await list()).map(({ capability_id }) => capability_id)).toContain(issued.capability_id)
    await wait_for(() => messages.some(({ type, payload }) => type === 'capability:issued' && (payload.capability as Capability).capability_id === issued.capability_id), 'capability:issued')
    expect(tags_for_event('capability:issued')).toContain('capabilities')

    expect(await send({ method: 'delete', path_template: '/libraries/{address}/capabilities/{id}', params: { address: own, id: issued.capability_id } })).toEqual({ ok: true, data: null })
    expect((await list()).find(({ capability_id }) => capability_id === issued.capability_id)?.status).toBe('revoked')
    await wait_for(() => messages.some(({ type }) => type === 'capability:revoked'), 'capability:revoked')
  })

  test('the node refuses an action it does not know', async () => {
    const grantee = parse_grantee_keys(new_key())
    if (!grantee.ok) throw new Error(grantee.reason)
    const refused = await send({ method: 'post', path_template: '/libraries/{address}/capabilities', params: { address: own }, body: { grantee: grantee.grantee, actions: ['library.append_listen'] } })
    expect(refused).toMatchObject({ ok: false, failure: { kind: 'http', status: 400 } })
  })

  test('a capability naming the identity\'s own key is listed among the held ones', async () => {
    const { public_key } = await call<{ public_key: string }>({ method: 'get', path_template: '/identity' })
    const issued = await call<Capability>({ method: 'post', path_template: '/libraries/{address}/capabilities', params: { address: own }, body: { grantee: { type: 'key', key: public_key }, actions: ['library.append_track'] } })
    const held = await call<Capability[]>({ method: 'get', path_template: '/identity/capabilities' })
    expect(held.map(({ capability_id }) => capability_id)).toContain(issued.capability_id)
  })
})
