// Web Audio playback of whole decoded files: one AudioBufferSourceNode at a
// time through a gain node. A source node plays once, so pause, resume, and
// seek each stop it and start a fresh one at the right offset.

export type EngineState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

export interface EngineSnapshot {
  state: EngineState
  position_seconds: number
  duration_seconds: number
  volume: number
  error: string | null
}

export interface AudioEngine {
  play: (input: { cid: string }) => Promise<void>
  pause: () => void
  resume: () => Promise<void>
  seek: (position_seconds: number) => void
  set_volume: (volume: number) => void
  stop: () => void
  get_snapshot: () => EngineSnapshot
  subscribe: (listener: (snapshot: EngineSnapshot) => void) => () => void
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

export const create_audio_engine = ({ load_audio, create_context = () => new AudioContext(), tick_ms = 250 }: {
  load_audio: (input: { cid: string }) => Promise<ArrayBuffer>
  create_context?: () => AudioContext
  tick_ms?: number
}): AudioEngine => {
  const listeners = new Set<(snapshot: EngineSnapshot) => void>()
  let snapshot: EngineSnapshot = { state: 'idle', position_seconds: 0, duration_seconds: 0, volume: 1, error: null }
  let context: AudioContext | null = null
  let gain: GainNode | null = null
  let buffer: AudioBuffer | null = null
  let source: AudioBufferSourceNode | null = null
  // Context time at which offset 0 of the buffer played (or would have).
  let started_at = 0
  let paused_at = 0
  // Each play bumps this, so a slow load that a later play overtook is dropped.
  let load_token = 0
  let tick: ReturnType<typeof setInterval> | null = null

  const emit = (patch: Partial<EngineSnapshot>): void => {
    snapshot = { ...snapshot, ...patch }
    for (const listener of listeners) listener(snapshot)
  }

  const open_context = (): { context: AudioContext, gain: GainNode } => {
    if (context === null || gain === null) {
      context = create_context()
      gain = context.createGain()
      gain.gain.value = snapshot.volume
      gain.connect(context.destination)
    }
    return { context, gain }
  }

  const current_position = (): number => {
    if (snapshot.state !== 'playing' || context === null || buffer === null) return paused_at
    return clamp(context.currentTime - started_at, 0, buffer.duration)
  }

  const stop_tick = (): void => {
    if (tick !== null) clearInterval(tick)
    tick = null
  }

  const stop_source = (): void => {
    stop_tick()
    if (source === null) return
    source.onended = null
    try {
      source.stop()
    } catch {}
    source.disconnect()
    source = null
  }

  const start_source = (offset: number): void => {
    if (buffer === null) return
    const opened = open_context()
    stop_source()
    const node = opened.context.createBufferSource()
    node.buffer = buffer
    node.connect(opened.gain)
    node.onended = () => {
      if (source !== node || buffer === null) return
      source = null
      stop_tick()
      paused_at = buffer.duration
      emit({ state: 'ended', position_seconds: buffer.duration })
    }
    started_at = opened.context.currentTime - offset
    node.start(0, offset)
    source = node
    tick = setInterval(() => { emit({ position_seconds: current_position() }) }, tick_ms)
  }

  return {
    play: async ({ cid }) => {
      const token = ++load_token
      stop_source()
      buffer = null
      paused_at = 0
      emit({ state: 'loading', position_seconds: 0, duration_seconds: 0, error: null })
      // Resume before the first await, while the click's user activation holds.
      const { context: opened } = open_context()
      const resumed = opened.resume()
      try {
        const data = await load_audio({ cid })
        if (token !== load_token) return
        const decoded = await opened.decodeAudioData(data)
        await resumed
        if (token !== load_token) return
        buffer = decoded
        emit({ state: 'playing', duration_seconds: decoded.duration })
        start_source(0)
      } catch (error) {
        if (token !== load_token) return
        emit({ state: 'error', error: error instanceof Error ? error.message : String(error) })
      }
    },
    pause: () => {
      if (snapshot.state !== 'playing') return
      paused_at = current_position()
      stop_source()
      emit({ state: 'paused', position_seconds: paused_at })
    },
    resume: async () => {
      if ((snapshot.state !== 'paused' && snapshot.state !== 'ended') || buffer === null) return
      const offset = snapshot.state === 'ended' ? 0 : paused_at
      await open_context().context.resume()
      emit({ state: 'playing', position_seconds: offset })
      start_source(offset)
    },
    seek: (position_seconds) => {
      if (buffer === null) return
      const offset = clamp(position_seconds, 0, buffer.duration)
      if (snapshot.state === 'playing') {
        start_source(offset)
      } else {
        paused_at = offset
        if (snapshot.state === 'ended') emit({ state: 'paused' })
      }
      emit({ position_seconds: offset })
    },
    set_volume: (volume) => {
      const level = clamp(volume, 0, 1)
      if (gain !== null) gain.gain.value = level
      emit({ volume: level })
    },
    stop: () => {
      load_token++
      stop_source()
      buffer = null
      paused_at = 0
      emit({ state: 'idle', position_seconds: 0, duration_seconds: 0, error: null })
    },
    get_snapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    }
  }
}
