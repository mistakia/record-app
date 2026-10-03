// The audio graph behind the engine: the AudioContext, the fade and volume
// gains, and the two slots. The current slot plays; the next slot is
// fetched (abortably) and decoded near the current one's end and started
// with start(when) at the context time the current buffer runs out.

import type { EngineTrack } from './audio-engine.ts'

export interface PlayingSlot {
  track: EngineTrack
  buffer: AudioBuffer
}

interface CurrentSlot extends PlayingSlot {
  source: AudioBufferSourceNode | null
  // Context time at which offset 0 of the buffer played (or would have).
  started_at: number
}

interface NextSlot {
  track: EngineTrack
  buffer: AudioBuffer | null
  loading: AbortController | null
  failed: boolean
  source: AudioBufferSourceNode | null
}

// A splice closer than this to the present is left to the ended path.
const MIN_LEAD_SECONDS = 0.005

export const create_slot_scheduler = ({ create_context, ramp_seconds, load_audio, get_volume, on_advance, on_ended }: {
  create_context: () => AudioContext
  ramp_seconds: number
  load_audio: (input: { cid: string, signal: AbortSignal }) => Promise<ArrayBuffer>
  get_volume: () => number
  // finished_played_seconds is the outgoing track's play time not yet taken.
  on_advance: (slot: PlayingSlot, finished_played_seconds: number) => void
  on_ended: (finished_played_seconds: number) => void
}) => {
  let graph: { context: AudioContext, fade: GainNode, volume: GainNode } | null = null
  let current: CurrentSlot | null = null
  let next: NextSlot | null = null
  let paused_at = 0
  // Context time up to which play time has been counted; null when not playing.
  let played_mark: number | null = null

  const open = (): { context: AudioContext, fade: GainNode, volume: GainNode } => {
    if (graph === null) {
      const context = create_context()
      const fade = context.createGain()
      const volume = context.createGain()
      volume.gain.value = get_volume()
      fade.connect(volume)
      volume.connect(context.destination)
      graph = { context, fade, volume }
    }
    return graph
  }

  const silence = (source: AudioBufferSourceNode | null, when?: number): void => {
    if (source === null) return
    source.onended = null
    try {
      source.stop(when)
    } catch {}
    if (when === undefined) source.disconnect()
  }

  const start_source = ({ buffer, when, offset }: { buffer: AudioBuffer, when: number, offset: number }): AudioBufferSourceNode => {
    const { context, fade } = open()
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(fade)
    source.start(when, offset)
    return source
  }

  const end_time = (slot: CurrentSlot): number => slot.started_at + slot.buffer.duration

  const unschedule_next = (): void => {
    if (next === null) return
    silence(next.source)
    next.source = null
  }

  const take_played_seconds = (): number => {
    if (played_mark === null || current?.source == null || graph === null) return 0
    const until = Math.min(graph.context.currentTime, end_time(current))
    const played = Math.max(0, until - played_mark)
    played_mark = until
    return played
  }

  // Makes the spliced-in next slot current. Called from the old source's
  // onended, and also whenever the clock has already reached the splice:
  // the next source is audible from its start time, and onended can arrive
  // after a pause or seek that needs to act on the audible slot.
  const promote_next = (): boolean => {
    if (current === null || next?.source == null || next.buffer === null) return false
    const finished = take_played_seconds()
    const when = end_time(current)
    const promoted: CurrentSlot = { track: next.track, buffer: next.buffer, source: next.source, started_at: when }
    next.source.onended = handle_current_end(next.source)
    current = promoted
    next = null
    played_mark = when
    on_advance(promoted, finished)
    return true
  }

  const handle_current_end = (source: AudioBufferSourceNode) => (): void => {
    if (current === null || current.source !== source) return
    if (promote_next()) return
    const finished = take_played_seconds()
    current.source = null
    paused_at = current.buffer.duration
    played_mark = null
    on_ended(finished)
  }

  // Starts the next slot at the exact end of the current buffer.
  const schedule_next = (): void => {
    if (current?.source == null || next?.buffer == null || next.source !== null || graph === null) return
    const when = end_time(current)
    if (when <= graph.context.currentTime + MIN_LEAD_SECONDS) return
    next.source = start_source({ buffer: next.buffer, when, offset: 0 })
  }

  const position = (): number => {
    if (current?.source == null || graph === null) return paused_at
    return Math.min(current.buffer.duration, Math.max(0, graph.context.currentTime - current.started_at))
  }

  const start_current_at = (offset: number, at?: number): void => {
    if (current === null) return
    const { context } = open()
    const when = at ?? context.currentTime
    silence(current.source, at)
    unschedule_next()
    const source = start_source({ buffer: current.buffer, when, offset })
    source.onended = handle_current_end(source)
    current.source = source
    current.started_at = when - offset
    played_mark = context.currentTime
    schedule_next()
  }

  return {
    // Promotes the next slot once the clock is past the splice, before
    // onended arrives.
    settle_transition: (): void => {
      if (current?.source == null || next?.source == null || graph === null) return
      if (graph.context.currentTime >= end_time(current)) promote_next()
    },
    resume_context: async (): Promise<void> => { await open().context.resume() },
    decode: async (data: ArrayBuffer): Promise<AudioBuffer> => await open().context.decodeAudioData(data),
    has_current: (): boolean => current !== null,
    position,
    paused_position: (): number => paused_at,
    take_played_seconds,
    // The decoded next buffer, when it is this track, so a skip to it plays at once.
    take_ready_next: (track: EngineTrack): AudioBuffer | null => {
      if (next === null || next.buffer === null || next.track.key !== track.key || next.track.cid !== track.cid) return null
      const { buffer } = next
      unschedule_next()
      next = null
      return buffer
    },
    start_current: ({ track, buffer, offset }: { track: EngineTrack, buffer: AudioBuffer, offset: number }): void => {
      silence(current?.source ?? null)
      current = { track, buffer, source: null, started_at: 0 }
      start_current_at(offset)
    },
    start_current_at,
    clear_current: (): void => {
      silence(current?.source ?? null)
      unschedule_next()
      current = null
      paused_at = 0
      played_mark = null
    },
    pause: (): number => {
      const at = position()
      silence(current?.source ?? null)
      if (current !== null) current.source = null
      unschedule_next()
      paused_at = at
      played_mark = null
      return at
    },
    // While playing, the jump fades out over ramp_seconds, swaps sources at
    // the silent point, and fades back in.
    seek: ({ position_seconds, playing }: { position_seconds: number, playing: boolean }): number => {
      if (current === null) return 0
      const offset = Math.min(current.buffer.duration, Math.max(0, position_seconds))
      if (!playing) {
        paused_at = offset
        return offset
      }
      const { context, fade } = open()
      const now = context.currentTime
      const swap_at = now + ramp_seconds
      fade.gain.cancelScheduledValues(now)
      fade.gain.setValueAtTime(1, now)
      fade.gain.linearRampToValueAtTime(0, swap_at)
      fade.gain.setValueAtTime(0, swap_at)
      fade.gain.linearRampToValueAtTime(1, swap_at + ramp_seconds)
      start_current_at(offset, swap_at)
      return offset
    },
    apply_volume: (): void => {
      if (graph !== null) graph.volume.gain.value = get_volume()
    },
    set_next: (track: EngineTrack | null): void => {
      if (track !== null && next !== null && next.track.key === track.key && next.track.cid === track.cid) return
      if (next !== null) {
        next.loading?.abort()
        unschedule_next()
      }
      next = track === null ? null : { track, buffer: null, loading: null, failed: false, source: null }
    },
    // Fetches and decodes the next track once the current one has
    // prebuffer_seconds or less left. Repeating the same audio reuses the
    // current buffer, so there are never more than two.
    maybe_prebuffer: (prebuffer_seconds: number): void => {
      if (current === null || next === null || next.buffer !== null || next.loading !== null || next.failed) return
      if (current.buffer.duration - position() > prebuffer_seconds) return
      const target = next
      if (target.track.cid === current.track.cid) {
        target.buffer = current.buffer
        schedule_next()
        return
      }
      const loading = new AbortController()
      target.loading = loading
      load_audio({ cid: target.track.cid, signal: loading.signal })
        .then(async (data) => {
          // A superseded download is not decoded.
          if (next !== target || loading.signal.aborted) return null
          return await open().context.decodeAudioData(data)
        })
        .then((buffer) => {
          if (buffer === null || next !== target || loading.signal.aborted) return
          target.buffer = buffer
          target.loading = null
          schedule_next()
        })
        .catch(() => {
          if (next !== target) return
          // Not retried each tick; the ended path loads it in the open instead.
          target.loading = null
          target.failed = true
        })
    }
  }
}
