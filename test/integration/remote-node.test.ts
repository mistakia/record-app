// The main-process node client against the pinned record-node, in process,
// with `cors_origins: []` as the canonical node runs. The node refuses any
// request carrying an Origin with 403, so a 403 anywhere here means the
// client leaked one. Ingest needs ffmpeg and fpcalc; set
// RECORD_TOOLCHAIN_PREFLIGHT=bypass where their versions differ from the pins,
// as record-node's own suite does.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

import { as_api_resolver, create_api_server, create_peer, start_peer, stop_api_server, stop_peer, type ApiServer, type Peer } from 'record-node'

import { get_audio, request_node, test_connection } from '#main/node-client.ts'
import type { NodeRequest, NodeResult } from '#shared/bridge.ts'
import type { Library, Settings, TrackList } from '#renderer/api/types.ts'

const FIXTURE_PATH = fileURLToPath(new URL('../../node_modules/record-node/test/fixtures/audio/sine-sweep-5s.flac', import.meta.url))
// A well-formed CIDv1 (raw, sha2-256 of the empty string) the node never stored.
const UNKNOWN_CID = 'bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku'

let peer: Peer
let server: ApiServer
let node_url: string

const refused_with_403 = (result: NodeResult<unknown>): boolean =>
  !result.ok && 'status' in result.failure && result.failure.status === 403

const request = async <T>(input: NodeRequest): Promise<T> => {
  const result = await request_node({ node_url, request: input })
  expect(refused_with_403(result)).toBe(false)
  if (!result.ok) throw new Error(`${input.method} ${input.path_template}: ${result.failure.message}`)
  return result.data as T
}

beforeAll(async () => {
  peer = await create_peer({ config: { network: false, allow_toolchain_mismatch: process.env.RECORD_TOOLCHAIN_PREFLIGHT === 'bypass' } })
  await start_peer(peer)
  await peer.ingest_file(FIXTURE_PATH)
  server = await create_api_server({ peer, resolve: as_api_resolver(peer.context.resolve), port: 0, cors_origins: [], log: false, validate_responses: true })
  node_url = `http://127.0.0.1:${server.port}`
}, 60_000)

afterAll(async () => {
  await stop_api_server(server)
  await stop_peer(peer)
})

describe('node client against an in-process record-node with cors_origins: []', () => {
  test('the node refuses a request that carries an Origin, so a missing 403 below means the client sent none', async () => {
    const response = await fetch(`${node_url}/api/settings`, { headers: { origin: 'http://localhost:5173' } })
    expect(response.status).toBe(403)
  })

  test('test_connection reports the node peer_id', async () => {
    const settings = await request<Settings>({ method: 'get', path_template: '/settings' })
    expect(await test_connection({ node_url })).toEqual({ ok: true, data: { peer_id: settings.peer_id, version: settings.version ?? null } })
  })

  test('test_connection reports a network failure for a closed port', async () => {
    const result = await test_connection({ node_url: 'http://127.0.0.1:9' })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.failure.kind).toBe('network')
  })

  test('lists libraries, fetches one by its encoded address, and lists its tracks', async () => {
    const libraries = await request<Library[]>({ method: 'get', path_template: '/libraries' })
    const own = libraries.find((library) => library.is_own)
    if (own === undefined) throw new Error('no own library')
    expect(own.address.includes('/')).toBe(true)
    const fetched = await request<Library>({ method: 'get', path_template: '/libraries/{address}', params: { address: own.address } })
    expect(fetched.address).toBe(own.address)

    const tracks = await request<TrackList>({ method: 'get', path_template: '/tracks', query: { offset: 0, limit: 200, library_addresses: [own.address] } })
    expect(tracks.total).toBe(1)
    expect(tracks.items[0]?.audio_cid).toBeString()
  })

  test('get_audio returns the whole blob for a stored CID', async () => {
    const tracks = await request<TrackList>({ method: 'get', path_template: '/tracks', query: { offset: 0, limit: 1 } })
    const [track] = tracks.items
    if (track === undefined) throw new Error('no track')
    const audio = await get_audio({ node_url, cid: track.audio_cid })
    if (!audio.ok) throw new Error(audio.failure.message)
    expect(audio.data.byteLength).toBe(track.audio_size_bytes)
  })

  test('get_audio reports 404 for a CID the node does not hold', async () => {
    const audio = await get_audio({ node_url, cid: UNKNOWN_CID })
    expect(audio.ok).toBe(false)
    expect(!audio.ok && audio.failure).toMatchObject({ kind: 'http', status: 404, code: 'NOT_FOUND' })
  })

  test('refuses a route the pinned yaml does not have, without calling the node', async () => {
    const result = await request_node({ node_url, request: { method: 'get', path_template: '/admin' } as unknown as NodeRequest })
    expect(!result.ok && result.failure.kind).toBe('refused')
  })
})
