// The playback action path end to end in the renderer: the controller, the
// real engine over a mocked AudioContext, the queue in the store, and the
// listen POST through a stand-in preload.

import { beforeAll, describe, expect, test } from 'bun:test'

import type { Track } from '#renderer/api/types.ts'
import type { NodeRequest, NodeResult } from '#shared/bridge.ts'
import { create_mock_context, sleep } from './mock-audio-context.ts'

const mock = create_mock_context()
const requests: NodeRequest[] = []
const audio_requests: string[] = []
Object.assign(globalThis, {
  AudioContext: function AudioContext () { return mock.context },
  window: {
    record: {
      request: async (request: NodeRequest): Promise<NodeResult<unknown>> => {
        requests.push(request)
        return { ok: true, data: { track_id: 'x', count: 1 } }
      },
      // Duration in seconds is the byte length (see the mock context).
      get_audio: async ({ cid }: { cid: string }): Promise<NodeResult<ArrayBuffer>> => {
        audio_requests.push(cid)
        return { ok: true, data: new ArrayBuffer(Number(cid.split('-')[1])) }
      },
      cancel_audio: async () => {}
    }
  }
})

const LIBRARY = '/record/own/record'
const track = (name: string, seconds: number): Track => ({
  id: name.padEnd(64, '0'),
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

const player = () => store.getState().player
const current_title = () => player().queue.entries[player().queue.index]?.title

beforeAll(async () => {
  controller = await import('#renderer/player/player-controller.ts')
  store = (await import('#renderer/store/index.ts')).store
  const { events_state_changed, reconcile_finished } = await import('#renderer/store/connection.ts')
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
    controller.play_tracks({ tracks: TRACKS, start_index: 1, library_address: LIBRARY })
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
    controller.play_tracks({ tracks: TRACKS, start_index: 2, library_address: LIBRARY })
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
    controller.play_tracks({ tracks: TRACKS, start_index: 0, library_address: LIBRARY })
    await sleep()
    const listens = () => requests.filter(({ path_template }) => path_template === '/listens')
    const before = listens().length
    mock.context.currentTime += 59
    await tick()
    expect(listens()).toHaveLength(before)
    mock.context.currentTime += 2
    await tick()
    mock.context.currentTime += 20
    await tick()
    expect(listens()).toHaveLength(before + 1)
    expect(listens().at(-1)).toEqual({ method: 'post', path_template: '/listens', body: { track_id: TRACKS[0]?.id, library_address: LIBRARY } })
  })

  test('remove, move, and add next keep the current entry and the engine\'s next in step', async () => {
    controller.play_tracks({ tracks: TRACKS, start_index: 0, library_address: LIBRARY })
    await sleep()
    controller.add_to_queue({ tracks: [track('d', 30)], at: 'next', library_address: LIBRARY })
    expect(player().queue.entries.map(({ title }) => title)).toEqual(['a', 'd', 'b', 'c'])
    controller.move_in_queue({ from: 3, to: 1 })
    expect(player().queue.entries.map(({ title }) => title)).toEqual(['a', 'c', 'd', 'b'])
    controller.remove_from_queue(player().queue.entries[0]?.queue_id ?? '')
    await sleep()
    expect(current_title()).toBe('c')
    expect(player().state).toBe('playing')
  })

  test('stop_playback empties the queue and keeps repeat', () => {
    controller.set_repeat_mode('one')
    controller.stop_playback()
    expect(player().queue).toMatchObject({ entries: [], index: -1, repeat: 'one' })
    expect(player().state).toBe('idle')
  })
})
