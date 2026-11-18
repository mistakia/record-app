// The playback action path end to end in the renderer: the controller, the
// real engine over a mocked AudioContext, the queue in the store, and the
// listen POST through a stand-in preload.

import { beforeAll, describe, expect, test } from 'bun:test'

import type { Track } from '#renderer/api/types.ts'
import type { NodeFailure, NodeRequest, NodeResult } from '#shared/bridge.ts'
import { create_mock_context, sleep } from './mock-audio-context.ts'

const mock = create_mock_context()
const requests: NodeRequest[] = []
const audio_requests: string[] = []
// The node's side of POST /listens: it counts a client_listen_id once, and
// listen_outcome decides what the app hears back.
const node_listen_ids = new Set<string>()
let listen_outcome: 'ok' | 'lost' | 'rejected' = 'ok'
const answer_listen = (body: { client_listen_id: string }): NodeResult<unknown> => {
  if (listen_outcome === 'rejected') return { ok: false, failure: { kind: 'http', status: 400, code: 'VALIDATION_ERROR', message: 'listened_at_ms is outside the window' } }
  node_listen_ids.add(body.client_listen_id)
  if (listen_outcome === 'lost') return { ok: false, failure: { kind: 'network', message: 'timeout', code: 'TIMEOUT' } }
  return { ok: true, data: { track_id: 'x', count: node_listen_ids.size } }
}
const storage_items = new Map<string, string>()
const listens = () => requests.filter(({ path_template }) => path_template === '/listens')
Object.assign(globalThis, {
  AudioContext: function AudioContext () { return mock.context },
  window: {
    record: {
      request: async (request: NodeRequest): Promise<NodeResult<unknown>> => {
        requests.push(request)
        if (request.path_template === '/listens') return answer_listen(request.body as { client_listen_id: string })
        return { ok: true, data: { track_id: 'x', count: 1 } }
      },
      // Duration in seconds is the byte length (see the mock context).
      get_audio: async ({ cid }: { cid: string }): Promise<NodeResult<ArrayBuffer>> => {
        audio_requests.push(cid)
        return { ok: true, data: new ArrayBuffer(Number(cid.split('-')[1])) }
      },
      cancel_audio: async () => {}
    },
    localStorage: { getItem: (key: string) => storage_items.get(key) ?? null, setItem: (key: string, value: string) => { storage_items.set(key, value) } }
  }
})

const LIBRARY = '/record/own/record'
const track = (name: string, seconds: number): Track => ({
  id: name.padEnd(64, '0'),
  library_addresses: [LIBRARY],
  content_cid: `content-${name}`,
  audio_cid: `${name}-${seconds}`,
  audio_size_bytes: 1,
  title: name,
  artist: 'Artist',
  tags: [],
  listen_count: 0,
  have_track: true
})
const TRACKS = [track('a', 100), track('b', 40), track('c', 20)]

let controller: typeof import('#renderer/player/player-controller.ts')
let store: typeof import('#renderer/store/index.ts')['store']

// The controller's engine ticks every 250 ms; pre-buffering and play-time
// counting happen on a tick.
const tick = async () => { await sleep(300) }

// Plays a long track past the threshold and stops, leaving one listen sent.
const record_a_listen = async () => {
  controller.play_tracks({ tracks: [track('heard', 300)], start_index: 0, library_address: LIBRARY, scope: '' })
  await sleep()
  mock.context.currentTime += 61
  await tick()
  controller.stop_playback()
  await sleep()
}

// Pending listens go out when writes become allowed again.
const flush_listens = async () => {
  const { reconcile_started, reconcile_finished } = await import('#renderer/store/connection.ts')
  store.dispatch(reconcile_started({ connection_id: 99 }))
  store.dispatch(reconcile_finished({ connection_id: 99, ok: true }))
  await sleep()
}

const player = () => store.getState().player
const current_title = () => player().queue.entries[player().queue.index]?.title

beforeAll(async () => {
  controller = await import('#renderer/player/player-controller.ts')
  store = (await import('#renderer/store/index.ts')).store
  const { connection_loaded, events_state_changed, reconcile_finished } = await import('#renderer/store/connection.ts')
  store.dispatch(connection_loaded({ mode: 'remote', node_url: 'http://127.0.0.1:3000', node_key: 'http://127.0.0.1:3000', auth: { status: 'none', persistent: true } }))
  // Writes are allowed: an open, reconciled connection.
  store.dispatch(events_state_changed({ status: 'open', node_url: 'http://127.0.0.1:3000', connection_id: 99, attempt: 0, retry_at_ms: null, last_error: null }))
  store.dispatch(reconcile_finished({ connection_id: 99, ok: true }))
  // Test files share one store; start from an empty queue, repeat off, no shuffle.
  const { player_restored } = await import('#renderer/store/player.ts')
  const { EMPTY_QUEUE } = await import('#renderer/player/queue-manager.ts')
  store.dispatch(player_restored({ queue: EMPTY_QUEUE, position_seconds: 0 }))
})

describe('player controller', () => {
  test('plays a list from the clicked track, splices the next one in gaplessly, and the queue follows', async () => {
    controller.play_tracks({ tracks: TRACKS, start_index: 1, library_address: LIBRARY, scope: '' })
    await sleep()
    expect(current_title()).toBe('b')
    expect(player().state).toBe('playing')
    // b is 40 s, under the 30 s pre-buffer point after 10 s; c is spliced in at b's end.
    mock.context.currentTime = 10
    await tick()
    const [b_source, c_source] = mock.sources.slice(-2)
    expect(c_source?.start_when).toBe((b_source?.start_when ?? 0) + 40)
    mock.finish(b_source)
    expect(current_title()).toBe('c')
    expect(player().key).toBe(player().queue.entries[2]?.queue_id ?? null)
  })

  test('the last track ends with repeat off and nothing follows; repeat all wraps to the first', async () => {
    mock.finish(mock.sources.at(-1))
    expect(player().state).toBe('ended')
    controller.set_repeat_mode('all')
    controller.play_tracks({ tracks: TRACKS, start_index: 2, library_address: LIBRARY, scope: '' })
    await sleep()
    mock.context.currentTime += 1
    await tick()
    const scheduled = mock.sources.at(-1)
    expect(scheduled?.buffer?.duration).toBe(100)
    mock.finish(mock.sources.at(-2))
    expect(current_title()).toBe('a')
    controller.set_repeat_mode('off')
  })

  test('next, previous, and previous past 3 s restarting the track', async () => {
    controller.next_track()
    await sleep()
    expect(current_title()).toBe('b')
    controller.previous_track()
    await sleep()
    expect(current_title()).toBe('a')
    mock.context.currentTime += 10
    await tick()
    controller.previous_track()
    expect(current_title()).toBe('a')
    expect(mock.sources.at(-1)?.start_offset).toBe(0)
  })

  test('records one listen at 60 s of play, through POST /listens with the play\'s library', async () => {
    controller.play_tracks({ tracks: TRACKS, start_index: 0, library_address: LIBRARY, scope: '' })
    await sleep()
    const before = listens().length
    mock.context.currentTime += 59
    await tick()
    expect(listens()).toHaveLength(before)
    mock.context.currentTime += 2
    await tick()
    mock.context.currentTime += 20
    await tick()
    expect(listens()).toHaveLength(before + 1)
    expect(listens().at(-1)).toMatchObject({ method: 'post', path_template: '/listens', body: { track_id: TRACKS[0]?.id, library_address: LIBRARY } })
    const body = listens().at(-1)?.body as { client_listen_id: string, listened_at_ms: number }
    expect(body.client_listen_id).toMatch(/^[A-Za-z0-9._:-]{1,128}$/)
    expect(Math.abs(body.listened_at_ms - Date.now())).toBeLessThan(10_000)
  })

  test('remove, move, and add next keep the current entry and the engine\'s next in step', async () => {
    controller.play_tracks({ tracks: TRACKS, start_index: 0, library_address: LIBRARY, scope: '' })
    await sleep()
    controller.add_to_queue({ tracks: [track('d', 30)], at: 'next', library_address: LIBRARY, scope: '' })
    expect(player().queue.entries.map(({ title }) => title)).toEqual(['a', 'd', 'b', 'c'])
    controller.move_in_queue({ from: 3, to: 1 })
    expect(player().queue.entries.map(({ title }) => title)).toEqual(['a', 'c', 'd', 'b'])
    controller.remove_from_queue(player().queue.entries[0]?.queue_id ?? '')
    await sleep()
    expect(current_title()).toBe('c')
    expect(player().state).toBe('playing')
  })

  test('mute holds the level and restores it; setting a level unmutes; zero unmutes to a fallback', () => {
    controller.set_playback_volume(0.7)
    controller.toggle_mute()
    expect([player().volume, player().muted_volume]).toEqual([0, 0.7])
    controller.toggle_mute()
    expect([player().volume, player().muted_volume]).toEqual([0.7, null])
    controller.toggle_mute()
    controller.set_playback_volume(0.4)
    expect([player().volume, player().muted_volume]).toEqual([0.4, null])
    controller.set_playback_volume(0)
    controller.toggle_mute()
    expect(player().volume).toBe(0.5)
    controller.set_playback_volume(1)
  })

  test('the playing track comes back in full, as it was queued', () => {
    controller.play_tracks({ tracks: TRACKS, start_index: 1, library_address: LIBRARY, scope: '' })
    expect(controller.playing_track()?.content_cid).toBe('content-b')
  })

  test('stop_playback empties the queue and keeps repeat', () => {
    controller.set_repeat_mode('one')
    controller.stop_playback()
    expect(player().queue).toMatchObject({ entries: [], index: -1, repeat: 'one' })
    expect(player().state).toBe('idle')
  })

  test('a seek on a restored track that has not loaded sets where play starts', async () => {
    const { player_restored } = await import('#renderer/store/player.ts')
    const { EMPTY_QUEUE } = await import('#renderer/player/queue-manager.ts')
    const entry = { queue_id: 'restored', track_id: 'r', audio_cid: 'r-100', title: 'Restored', artist: null, duration_seconds: 100, library_address: LIBRARY }
    store.dispatch(player_restored({ queue: { ...EMPTY_QUEUE, entries: [entry], index: 0 }, position_seconds: 3 }))
    expect(player().state).toBe('idle')
    controller.seek_playback(42)
    expect(player().position_seconds).toBe(42)
    controller.seek_playback(500)
    expect(player().position_seconds).toBe(100)
    controller.seek_playback(42)
    controller.toggle_playback()
    await sleep()
    expect(player().state).toBe('playing')
    expect(mock.sources.at(-1)?.start_offset).toBe(42)
    controller.stop_playback()
  })

  test('a skip just past 60 s records the outgoing track\'s listen, not the incoming one\'s', async () => {
    const long = track('long', 300)
    controller.play_tracks({ tracks: [long, track('b', 40)], start_index: 0, library_address: LIBRARY, scope: '' })
    await sleep()
    const before = listens().length
    mock.context.currentTime += 59.9
    await tick()
    mock.context.currentTime += 0.2
    controller.next_track()
    await tick()
    expect(listens()).toHaveLength(before + 1)
    expect((listens().at(-1)?.body as { track_id: string }).track_id).toBe(long.id)
    controller.stop_playback()
  })

  test('a listen whose response was lost is sent again with the same key and counted once', async () => {
    const counted = node_listen_ids.size
    listen_outcome = 'lost'
    await record_a_listen()
    const first = listens().at(-1)?.body
    const attempts = listens().length
    listen_outcome = 'ok'
    await flush_listens()
    expect(listens()).toHaveLength(attempts + 1)
    expect(listens().at(-1)?.body).toEqual(first)
    expect(node_listen_ids.size).toBe(counted + 1)
    const sent = listens().length
    await flush_listens()
    expect(listens()).toHaveLength(sent)
  })

  test('a listen the node answers 400 is dropped, not sent again', async () => {
    listen_outcome = 'rejected'
    await record_a_listen()
    const sent = listens().length
    listen_outcome = 'ok'
    await flush_listens()
    expect(listens()).toHaveLength(sent)
  })

  test('a listen is kept for a failure that may pass and dropped for one that will not', () => {
    const retried: NodeFailure[] = [
      { kind: 'refused', message: 'gated' },
      { kind: 'not_configured', message: 'none' },
      { kind: 'busy', message: 'busy' },
      { kind: 'auth', status: 401, message: 'token refused' },
      { kind: 'tls', message: 'bad cert' },
      { kind: 'aborted', message: 'cancelled' },
      { kind: 'network', message: 'timeout', code: 'TIMEOUT' },
      { kind: 'network', message: 'unknown', code: null },
      { kind: 'http', status: 500, code: null, message: 'boom' },
      { kind: 'http', status: 503, code: null, message: 'unavailable' }
    ]
    const dropped: NodeFailure[] = [
      { kind: 'http', status: 400, code: 'VALIDATION_ERROR', message: 'bad time' },
      { kind: 'http', status: 404, code: null, message: 'no such track' },
      { kind: 'too_large', message: 'too large' }
    ]
    expect(retried.map(controller.listen_worth_retrying)).toEqual(retried.map(() => true))
    expect(dropped.map(controller.listen_worth_retrying)).toEqual(dropped.map(() => false))
  })
})
