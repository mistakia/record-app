// The replication policy (spec §4.6.1, §8.6.5a) against an in-process
// record-node: a linked library reads and sets its mode and selective
// filter, a malformed filter is refused, an own library's policy is fixed,
// and Library.replication_mode follows.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { create_peer, start_peer, stop_peer, type Peer } from 'record-node'

import { request_node } from '#main/node-client.ts'
import type { Library, ReplicationPolicy } from '#renderer/api/types.ts'
import type { NodeRequest, NodeResult } from '#shared/bridge.ts'
import { start_test_node, type TestNode } from './node-fixture.ts'

let node: TestNode
let other: Peer
let linked: string

const send = async (request: NodeRequest): Promise<NodeResult<unknown>> => await request_node({ node_url: node.node_url, request })
const call = async <T>(request: NodeRequest): Promise<T> => {
  const result = await send(request)
  if (!result.ok) throw new Error(`${request.method} ${request.path_template}: ${result.failure.message}`)
  return result.data as T
}
const policy_of = async (address: string): Promise<ReplicationPolicy> =>
  await call<ReplicationPolicy>({ method: 'get', path_template: '/libraries/{address}/replication-policy', params: { address } })

beforeAll(async () => {
  node = await start_test_node()
  other = await create_peer({ config: { network: false, allow_toolchain_mismatch: true } })
  await start_peer(other)
  linked = other.identity().own_address
  await call<Library>({ method: 'post', path_template: '/libraries', body: { library_address: linked, alias: 'Other' } })
}, 120_000)

afterAll(async () => {
  await stop_peer(other)
  await node.stop()
})

describe('replication policy', () => {
  test('a linked library defaults to full, and takes selective with a filter, then index_only', async () => {
    expect(await policy_of(linked)).toMatchObject({ mode: 'full', filter: null })
    const filter = { type: 'match', fields: { tags: 'keep' } }
    const set = await call<ReplicationPolicy>({ method: 'put', path_template: '/libraries/{address}/replication-policy', params: { address: linked }, body: { mode: 'selective', filter } })
    expect(set).toMatchObject({ mode: 'selective', filter })
    const library = (await call<Library[]>({ method: 'get', path_template: '/libraries' })).find(({ address }) => address === linked)
    expect(library?.replication_mode).toBe('selective')
    await call({ method: 'put', path_template: '/libraries/{address}/replication-policy', params: { address: linked }, body: { mode: 'index_only' } })
    expect(await policy_of(linked)).toMatchObject({ mode: 'index_only', filter: null })
  })

  test('refuses a filter the node cannot evaluate, and an own library\'s change', async () => {
    const bad = await send({ method: 'put', path_template: '/libraries/{address}/replication-policy', params: { address: linked }, body: { mode: 'selective', filter: { type: 'regex', pattern: 'x' } } })
    expect(bad).toMatchObject({ ok: false, failure: { status: 400 } })
    const own = node.peer.identity().own_address
    expect(await policy_of(own)).toMatchObject({ mode: 'full' })
    const refused = await send({ method: 'put', path_template: '/libraries/{address}/replication-policy', params: { address: own }, body: { mode: 'index_only' } })
    expect(refused).toMatchObject({ ok: false, failure: { status: 409 } })
  })
})
