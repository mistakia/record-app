// Pins and the head-check (spec §4.6.2, §8.8.5) against an in-process
// record-node: a pin by audio CID marks the track pinned and records a pin in
// the identity library, an unpin clears it, the events reach the app, and a
// write moves its library's heads, which is what the head-check compares.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { request_node } from '#main/node-client.ts'
import { open_node_events, type NodeEvents } from '#main/node-events.ts'
import { moved_libraries } from '#renderer/store/head-check.ts'
import type { Library, Track, TrackList } from '#renderer/api/types.ts'
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
const first_track = async (): Promise<Track> => {
  const [track] = (await call<TrackList>({ method: 'get', path_template: '/tracks', query: { offset: 0, limit: 1 } })).items
  if (track === undefined) throw new Error('no track')
  return track
}
const wait_for = async (condition: () => boolean, label: string): Promise<void> => {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error(`timed out waiting for ${label}`)
}

beforeAll(async () => {
  node = await start_test_node()
  await node.peer.ingest_file(node.make_audio({ name: 'Pin Me.flac', seed: 31 }))
  events = open_node_events({ node_url: node.node_url, on_event: (message) => { messages.push(message) }, on_state: () => {} })
  await wait_for(() => events.get_state().status === 'open', 'events')
}, 120_000)

afterAll(async () => {
  events.close()
  await node.stop()
})

describe('pins', () => {
  test('pins and unpins a track by its audio CID, recorded in the identity library', async () => {
    const track = await first_track()
    expect(track.is_pinned).toBe(false)
    await call({ method: 'post', path_template: '/tracks/{cid}/pin', params: { cid: track.audio_cid } })
    expect((await first_track()).is_pinned).toBe(true)
    await wait_for(() => messages.some(({ type }) => type === 'track:pinned'), 'track:pinned')
    const pins = await call<{ items: Array<{ type: string, op: string }> }>({ method: 'get', path_template: '/identity/meta-log', query: { type: 'pin', current_only: true } })
    expect(pins.items.some(({ type, op }) => type === 'pin' && op === 'PUT')).toBe(true)
    await call({ method: 'delete', path_template: '/tracks/{cid}/pin', params: { cid: track.audio_cid } })
    expect((await first_track()).is_pinned).toBe(false)
    await wait_for(() => messages.some(({ type }) => type === 'track:unpinned'), 'track:unpinned')
  })
})

describe('head-check', () => {
  test('a write moves only its own library\'s heads', async () => {
    const before = await call<Library[]>({ method: 'get', path_template: '/libraries' })
    const own = node.peer.identity().own_address
    const track = await first_track()
    await call({ method: 'post', path_template: '/tags', body: { track_id: track.id, tag: 'head-check', library_address: own } })
    const after = await call<Library[]>({ method: 'get', path_template: '/libraries' })
    expect(after.find(({ address }) => address === own)?.heads.length).toBeGreaterThan(0)
    expect(moved_libraries({ before, after }).map(({ address }) => address)).toEqual([own])
    expect(moved_libraries({ before: after, after })).toEqual([])
  })
})
