// Web Audio playback of whole decoded files with gapless transitions. Two
// slots at most (spec §8.11.2): the current track, and the next one, fetched
// once the current has prebuffer_seconds left and started with
// start(when) at the exact context time the current one ends, so the splice
// is sample-accurate. Sources run through a fade gain (5 ms ramps around a
// seek) and a volume gain. Each start of a track is a new play_id, and
// played_seconds counts context time actually played in it, for listens.

import { create_slot_scheduler, type PlayingSlot } from './audio-slots.ts'

export type EngineState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

// key identifies the queue entry, cid the audio to fetch.
export interface EngineTrack {
  key: string
  cid: string
}

export interface EngineSnapshot {
  state: EngineState
  key: string | null
  play_id: number
  position_seconds: number
  duration_seconds: number
  played_seconds: number
  volume: number
  error: string | null
}

export interface AudioEngine {
  // start_at resumes a restored position (seconds into the track).
  play: (input: { track: EngineTrack, start_at?: number }) => Promise<void>
  // The track to splice in when the current one ends, or null for none.
  set_next: (track: EngineTrack | null) => void
  pause: () => void
  resume: () => Promise<void>
  seek: (position_seconds: number) => void
  set_volume: (volume: number) => void
  stop: () => void
  get_snapshot: () => EngineSnapshot
  subscribe: (listener: (snapshot: EngineSnapshot) => void) => () => void
  // Called when the next track took over without a gap.
  on_advance: (listener: (key: string) => void) => () => void
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

export const create_audio_engine = ({
  load_audio,
  create_context = () => new AudioContext(),
  tick_ms = 250,
  prebuffer_seconds = 30,
  ramp_seconds = 0.005
}: {
  load_audio: (input: { cid: string, signal: AbortSignal }) => Promise<ArrayBuffer>
  create_context?: () => AudioContext
  tick_ms?: number
  prebuffer_seconds?: number
  ramp_seconds?: number
}): AudioEngine => {
  const listeners = new Set<(snapshot: EngineSnapshot) => void>()
  const advance_listeners = new Set<(key: string) => void>()
  let snapshot: EngineSnapshot = { state: 'idle', key: null, play_id: 0, position_seconds: 0, duration_seconds: 0, played_seconds: 0, volume: 1, error: null }
  let tick: ReturnType<typeof setInterval> | null = null
  // Each play aborts the load of the one before it.
  let play_load: AbortController | null = null

  const emit = (patch: Partial<EngineSnapshot>): void => {
    snapshot = { ...snapshot, ...patch }
    for (const listener of listeners) listener(snapshot)
  }

  const slots = create_slot_scheduler({
    create_context,
    ramp_seconds,
    load_audio,
    get_volume: () => snapshot.volume,
    // The outgoing play's last stretch is counted before the new play starts.
    on_advance: (slot: PlayingSlot, finished_played_seconds: number) => {
      emit({ played_seconds: snapshot.played_seconds + finished_played_seconds })
      emit({ key: slot.track.key, play_id: snapshot.play_id + 1, duration_seconds: slot.buffer.duration, position_seconds: 0, played_seconds: 0 })
      for (const listener of advance_listeners) listener(slot.track.key)
    },
    on_ended: (finished_played_seconds: number) => {
      stop_tick()
      emit({ state: 'ended', position_seconds: snapshot.duration_seconds, played_seconds: snapshot.played_seconds + finished_played_seconds })
    }
  })

  const stop_tick = (): void => {
    if (tick !== null) clearInterval(tick)
    tick = null
  }

  const start_tick = (): void => {
    stop_tick()
    tick = setInterval(() => {
      if (snapshot.state !== 'playing') return
      emit({ position_seconds: slots.position(), played_seconds: snapshot.played_seconds + slots.take_played_seconds() })
      slots.maybe_prebuffer(prebuffer_seconds)
    }, tick_ms)
  }

  const settle_played = (): void => {
    if (snapshot.state === 'playing') snapshot = { ...snapshot, played_seconds: snapshot.played_seconds + slots.take_played_seconds() }
  }

  return {
    play: async ({ track, start_at = 0 }) => {
      play_load?.abort()
      const load = new AbortController()
      play_load = load
      stop_tick()
      settle_played()
      const ready = slots.take_ready_next(track)
      slots.clear_current()
      emit({ state: 'loading', key: track.key, position_seconds: 0, duration_seconds: 0, error: null })
      // Resume before the first await, while the click's user activation holds.
      const resumed = slots.resume_context()
      try {
        const buffer = ready ?? await slots.decode(await load_audio({ cid: track.cid, signal: load.signal }))
        await resumed
        if (load.signal.aborted) return
        const offset = clamp(start_at, 0, buffer.duration)
        slots.start_current({ track, buffer, offset })
        emit({ state: 'playing', play_id: snapshot.play_id + 1, duration_seconds: buffer.duration, position_seconds: offset, played_seconds: 0 })
        start_tick()
        slots.maybe_prebuffer(prebuffer_seconds)
      } catch (error) {
        if (load.signal.aborted) return
        emit({ state: 'error', error: error instanceof Error ? error.message : String(error) })
      }
    },
    set_next: (track) => {
      slots.set_next(track)
      if (snapshot.state === 'playing') slots.maybe_prebuffer(prebuffer_seconds)
    },
    pause: () => {
      if (snapshot.state !== 'playing') return
      settle_played()
      stop_tick()
      const position = slots.pause()
      emit({ state: 'paused', position_seconds: position })
    },
    resume: async () => {
      if ((snapshot.state !== 'paused' && snapshot.state !== 'ended') || !slots.has_current()) return
      const load = play_load
      await slots.resume_context()
      // A play, stop, or seek may have run while the context resumed.
      if (load !== play_load || (snapshot.state !== 'paused' && snapshot.state !== 'ended') || !slots.has_current()) return
      const offset = snapshot.state === 'ended' ? 0 : slots.paused_position()
      slots.start_current_at(offset)
      emit({ state: 'playing', position_seconds: offset })
      start_tick()
      slots.maybe_prebuffer(prebuffer_seconds)
    },
    seek: (position_seconds) => {
      if (!slots.has_current()) return
      settle_played()
      const offset = slots.seek({ position_seconds, playing: snapshot.state === 'playing' })
      emit({ position_seconds: offset, ...(snapshot.state === 'ended' ? { state: 'paused' as const } : {}) })
    },
    set_volume: (volume) => {
      const level = clamp(volume, 0, 1)
      snapshot = { ...snapshot, volume: level }
      slots.apply_volume()
      emit({ volume: level })
    },
    stop: () => {
      play_load?.abort()
      play_load = null
      stop_tick()
      slots.clear_current()
      slots.set_next(null)
      emit({ state: 'idle', key: null, position_seconds: 0, duration_seconds: 0, played_seconds: 0, error: null })
    },
    get_snapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    on_advance: (listener) => {
      advance_listeners.add(listener)
      return () => { advance_listeners.delete(listener) }
    }
  }
}
