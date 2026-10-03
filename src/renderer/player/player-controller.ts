// The one action path for playback. Every way of driving the player (the
// player bar, the queue panel, the track list, Media Session and the media
// keys) calls these functions, which move the queue, tell the engine what
// plays now and what follows, and record listens.

import { create_audio_engine, type EngineTrack } from './audio-engine.ts'
import { create_listen_recorder } from './listen-recorder.ts'
import {
  add_entries,
  current_entry,
  EMPTY_QUEUE,
  jump_to,
  move_entry,
  peek_next,
  remove_entry,
  set_entries,
  set_repeat,
  step,
  toggle_shuffle,
  type QueueEntry,
  type QueueState,
  type RepeatMode
} from './queue-manager.ts'
import type { Track } from '#renderer/api/types.ts'
import type { NodeFailure } from '#shared/bridge.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { store } from '#renderer/store/index.ts'
import { cued_position_changed, engine_updated, queue_changed } from '#renderer/store/player.ts'

// Previous restarts the current track instead when this far into it.
const RESTART_THRESHOLD_SECONDS = 3

const engine = create_audio_engine({
  load_audio: async ({ cid, signal }) => {
    const request_id = crypto.randomUUID()
    const cancel = () => { window.record.cancel_audio({ request_id }).catch(() => {}) }
    signal.addEventListener('abort', cancel, { once: true })
    try {
      const result = await window.record.get_audio({ cid, request_id })
      if (!result.ok) throw new Error(result.failure.message)
      return result.data
    } finally {
      signal.removeEventListener('abort', cancel)
    }
  }
})

// System errors that mean the request never left this machine or was never
// accepted by the node.
const NEVER_SENT_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'])
const LISTEN_FLUSH_INTERVAL_MS = 30_000

// POST /listens is not idempotent, so a listen is retried only when the
// request provably never reached the node: gated by the app, no node
// configured, connection refused, or the name did not resolve. A timeout or
// a connection dropped mid-request may have landed, and a rare lost listen
// is better than a duplicate.
export const listen_never_reached_node = (failure: NodeFailure): boolean =>
  failure.kind === 'refused' || failure.kind === 'not_configured' ||
  (failure.kind === 'network' && failure.code !== null && NEVER_SENT_CODES.has(failure.code))

const recorder = create_listen_recorder({
  record: async (listen) => {
    const result = await store.dispatch(node_api.endpoints.record_listen.initiate(listen))
    if (result.error === undefined) return true
    return !listen_never_reached_node(result.error as NodeFailure)
  }
})

const queue = (): QueueState => store.getState().player.queue

const to_engine_track = (entry: QueueEntry): EngineTrack => ({ key: entry.queue_id, cid: entry.audio_cid })

const to_entry = ({ track, library_address }: { track: Track, library_address: string }): QueueEntry => ({
  queue_id: crypto.randomUUID(),
  track_id: track.id,
  audio_cid: track.audio_cid,
  title: track.title ?? null,
  artist: track.artist ?? null,
  duration_seconds: track.duration_seconds ?? null,
  library_address
})

// Tells the engine what follows the current entry, for the gapless splice.
const sync_next = (): void => {
  const state = queue()
  const index = peek_next(state)
  const entry = index === null ? undefined : state.entries[index]
  engine.set_next(entry === undefined ? null : to_engine_track(entry))
}

const commit_queue = (next_queue: QueueState): void => {
  store.dispatch(queue_changed(next_queue))
  sync_next()
}

const play_current = (start_at = 0): void => {
  const entry = current_entry(queue())
  if (entry === null) {
    engine.stop()
    return
  }
  engine.play({ track: to_engine_track(entry), start_at }).catch(() => {})
  sync_next()
}

let last_state = engine.get_snapshot().state
engine.subscribe((snapshot) => {
  store.dispatch(engine_updated(snapshot))
  // The listen belongs to the entry the engine is reporting on, which can
  // differ from the queue's current entry while a skip is under way.
  const entry = queue().entries.find(({ queue_id }) => queue_id === snapshot.key)
  recorder.observe({
    play_id: snapshot.play_id,
    played_seconds: snapshot.played_seconds,
    duration_seconds: snapshot.duration_seconds,
    listen: entry === undefined ? null : { track_id: entry.track_id, library_address: entry.library_address }
  })
  // The track ran out with nothing spliced in (no next, or it was not
  // ready in time): move on the ordinary way.
  if (snapshot.state === 'ended' && last_state !== 'ended') {
    const index = peek_next(queue())
    if (index !== null) {
      store.dispatch(queue_changed(jump_to({ queue: queue(), index })))
      play_current()
    }
  }
  last_state = snapshot.state
})

// The next entry took over without a gap; the queue follows the engine.
engine.on_advance((key) => {
  const index = queue().entries.findIndex(({ queue_id }) => queue_id === key)
  if (index !== -1) commit_queue(jump_to({ queue: queue(), index }))
})

// Held-back listens go out when writes become allowed, and every 30 s while
// they are, in case one was held while writes were already allowed.
let writes_allowed = false
store.subscribe(() => {
  const allowed = select_writes_allowed(store.getState())
  if (allowed && !writes_allowed) recorder.flush_pending()
  writes_allowed = allowed
})
setInterval(() => {
  if (writes_allowed && recorder.pending_count() > 0) recorder.flush_pending()
}, LISTEN_FLUSH_INTERVAL_MS)

export const play_tracks = ({ tracks, start_index, library_address }: { tracks: Track[], start_index: number, library_address: string }): void => {
  const entries = tracks.map((track) => to_entry({ track, library_address }))
  store.dispatch(queue_changed(set_entries({ queue: queue(), entries, start_index })))
  play_current()
}

export const add_to_queue = ({ tracks, at, library_address }: { tracks: Track[], at: 'next' | 'end', library_address: string }): void => {
  commit_queue(add_entries({ queue: queue(), entries: tracks.map((track) => to_entry({ track, library_address })), at }))
}

export const toggle_playback = (): void => {
  const { state, position_seconds } = store.getState().player
  if (state === 'playing') {
    engine.pause()
    return
  }
  // Nothing loaded, as after a restore or an error: load the current entry
  // and start where it left off.
  if (state === 'idle' || state === 'error') {
    play_current(position_seconds)
    return
  }
  engine.resume().catch(() => {})
}

export const pause_playback = (): void => { engine.pause() }

export const resume_playback = (): void => {
  if (store.getState().player.state !== 'playing') toggle_playback()
}

export const next_track = (): void => {
  const index = step({ queue: queue(), direction: 1 })
  if (index === null) return
  store.dispatch(queue_changed(jump_to({ queue: queue(), index })))
  play_current()
}

export const previous_track = (): void => {
  const index = step({ queue: queue(), direction: -1 })
  if (index === null || store.getState().player.position_seconds > RESTART_THRESHOLD_SECONDS) {
    engine.seek(0)
    return
  }
  store.dispatch(queue_changed(jump_to({ queue: queue(), index })))
  play_current()
}

export const jump_to_entry = (index: number): void => {
  store.dispatch(queue_changed(jump_to({ queue: queue(), index })))
  play_current()
}

export const remove_from_queue = (queue_id: string): void => {
  const was_current = current_entry(queue())?.queue_id === queue_id
  store.dispatch(queue_changed(remove_entry({ queue: queue(), queue_id })))
  const { state } = store.getState().player
  if (was_current && (state === 'playing' || state === 'loading')) play_current()
  else if (was_current) engine.stop()
  sync_next()
}

export const move_in_queue = ({ from, to }: { from: number, to: number }): void => {
  commit_queue(move_entry({ queue: queue(), from, to }))
}

export const set_repeat_mode = (repeat: RepeatMode): void => { commit_queue(set_repeat({ queue: queue(), repeat })) }

export const toggle_shuffle_mode = (): void => { commit_queue(toggle_shuffle({ queue: queue() })) }

// With nothing loaded (a restored or failed track) there is no buffer to
// seek in, so the position is kept as the offset the next play starts at.
export const seek_playback = (position_seconds: number): void => {
  const { state } = store.getState().player
  if ((state === 'idle' || state === 'error') && current_entry(queue()) !== null) store.dispatch(cued_position_changed(position_seconds))
  else engine.seek(position_seconds)
}

export const set_playback_volume = (volume: number): void => { engine.set_volume(volume) }

// Part of the teardown on a node switch: nothing keeps playing from the old
// node, and its queue goes with it. Repeat and shuffle stay.
export const stop_playback = (): void => {
  engine.stop()
  const { repeat, shuffle } = queue()
  commit_queue({ ...EMPTY_QUEUE, repeat, shuffle })
}
