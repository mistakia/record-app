// Remote bearer auth (spec §8.7.3, §8.7.7) against an in-process
// record-node that requires a token: the Authorization header on REST and
// audio, the bearer.<token> subprotocol on the WebSocket, and the whole
// main-process path from a refused token to a re-entered one.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { create_authed_call } from '#main/authed-call.ts'
import { open_connection_store } from '#main/connection-store.ts'
import { import_chosen_paths } from '#main/import-files.ts'
import { create_node_auth } from '#main/node-auth.ts'
import { get_audio, request_node, test_connection } from '#main/node-client.ts'
import { create_node_connection } from '#main/node-connection.ts'
import { open_node_events } from '#main/node-events.ts'
import { create_node_session } from '#main/node-session.ts'
import { create_memory_token_store } from '#main/token-store.ts'
import type { TrackList } from '#renderer/api/types.ts'
import type { BundledState, EventsState } from '#shared/bridge.ts'
import { start_test_node, type TestNode } from './node-fixture.ts'

const TOKEN = 'hosted-node-token.v1'
let node: TestNode
// Every request and WebSocket upgrade the node authenticates.
let authentications = 0

const wait_for = async (condition: () => boolean, label: string): Promise<void> => {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error(`timed out waiting for ${label}`)
}

beforeAll(async () => {
  node = await start_test_node({ authenticate: (token) => { authentications++; return token === TOKEN } })
  await node.peer.ingest_file(node.make_audio({ name: 'Authed.flac', seed: 7 }))
}, 120_000)

afterAll(async () => { await node.stop() })

describe('bearer auth against a hosted node', () => {
  test('REST and audio carry the token, and a missing or wrong one is an auth failure', async () => {
    const tracks_request = { method: 'get', path_template: '/tracks', query: { offset: 0, limit: 10 } } as const
    for (const token of [undefined, 'wrong']) {
      const refused = await request_node({ node_url: node.node_url, token, request: tracks_request })
      expect(refused).toMatchObject({ ok: false, failure: { kind: 'auth', status: 401 } })
    }
    const listed = await request_node({ node_url: node.node_url, token: TOKEN, request: tracks_request })
    if (!listed.ok) throw new Error(listed.failure.message)
    const [track] = (listed.data as TrackList).items
    if (track?.audio_cid === undefined) throw new Error('no track')
    expect((await get_audio({ node_url: node.node_url, cid: track.audio_cid })).ok).toBe(false)
    const audio = await get_audio({ node_url: node.node_url, token: TOKEN, cid: track.audio_cid })
    expect(audio.ok && audio.data.byteLength > 0).toBe(true)
    expect(await test_connection({ node_url: node.node_url })).toMatchObject({ ok: false, failure: { kind: 'auth' } })
    expect((await test_connection({ node_url: node.node_url, token: TOKEN })).ok).toBe(true)
  })

  test('file import carries the token', async () => {
    const path = node.make_audio({ name: 'Upload.flac', seed: 8 })
    expect(await import_chosen_paths({ node_url: node.node_url, paths: [path] })).toMatchObject({ ok: false, failure: { kind: 'auth' } })
    const ack = await import_chosen_paths({ node_url: node.node_url, token: TOKEN, paths: [path] })
    expect(ack.ok).toBe(true)
    // Let the ingest finish before the node stops under it.
    let count = 0
    await wait_for(() => {
      request_node({ node_url: node.node_url, token: TOKEN, request: { method: 'get', path_template: '/tracks', query: { offset: 0, limit: 10 } } })
        .then((result) => { if (result.ok) count = (result.data as TrackList).items.length }).catch(() => {})
      return count === 2
    }, 'ingest')
  }, 30_000)

  test('the WebSocket opens with the bearer subprotocol and not without it', async () => {
    const states: Array<EventsState['status']> = []
    const authed = open_node_events({ node_url: node.node_url, token: TOKEN, on_event: () => {}, on_state: ({ status }) => { states.push(status) } })
    const bare = open_node_events({ node_url: node.node_url, on_event: () => {}, on_state: () => {}, delay_ms: () => 60_000 })
    try {
      await wait_for(() => authed.get_state().status === 'open', 'authed socket')
      await wait_for(() => bare.get_state().status === 'reconnecting', 'bare socket refused')
      expect(bare.get_state().connection_id).toBe(0)
    } finally {
      authed.close()
      bare.close()
    }
  })

  test('a refused token is forgotten, nothing more is sent, and a re-entered token reconnects', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'record-app-bearer-'))
    const session_states: EventsState[] = []
    try {
      const store = await open_connection_store({ file_path: join(directory, 'connection.json') })
      await store.save({ mode: 'remote', node_url: node.node_url })
      const tokens = create_memory_token_store()
      await tokens.set(node.node_url, 'stale-token')
      const manager = {
        get_state: () => ({ status: 'stopped', url: null, node_key_pin: null }) as unknown as BundledState,
        start: async () => {},
        stop: async () => {}
      }
      const late: { connection?: ReturnType<typeof create_node_connection> } = {}
      const session = create_node_session({
        broadcast: (channel, payload) => { if (channel.endsWith(':state')) session_states.push(payload as EventsState) },
        on_unauthorized: (sent) => { late.connection?.unauthorized(sent) },
        open_events: (options) => open_node_events({ ...options, delay_ms: () => 50 })
      })
      const connection = create_node_connection({ store, auth: create_node_auth({ tokens }), manager, session, on_node_changed: () => {} })
      late.connection = connection
      await connection.start()
      expect(connection.target()).toMatchObject({ node_url: node.node_url, token: 'stale-token', blocked: false })

      // The upgrade is refused; the reconnect probe learns why over REST.
      await wait_for(() => session.get_state().status === 'unauthorized', 'unauthorized')
      expect(await tokens.get(node.node_url)).toBeNull()
      expect(connection.view().auth.status).toBe('rejected')
      expect(connection.target()?.blocked).toBe(true)

      // Blocked: requests are refused in main, and the socket stays shut.
      const authed = create_authed_call({ target: connection.target, unauthorized: connection.unauthorized })
      const before = authentications
      const blocked = await authed(async ({ node_url, token }) => await request_node({ node_url, token, request: { method: 'get', path_template: '/settings' } }))
      expect(blocked).toMatchObject({ ok: false, failure: { kind: 'auth' } })
      await new Promise((resolve) => setTimeout(resolve, 500))
      expect(authentications).toBe(before)

      await connection.store_token({ node_url: node.node_url, token: TOKEN })
      await connection.switched()
      expect(await tokens.get(node.node_url)).toBe(TOKEN)
      await wait_for(() => session.get_state().status === 'open', 'reopened')
      expect(connection.view().auth.status).toBe('saved')

      await connection.logout()
      expect(await tokens.get(node.node_url)).toBeNull()
      await wait_for(() => session.get_state().status === 'unauthorized', 'unauthorized after logout')
      session.stop()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
    expect(session_states.some(({ status }) => status === 'unauthorized')).toBe(true)
  }, 30_000)
})
