// A scriptable AudioContext for engine tests: the clock is set by hand,
// sources record their start and stop times, gains record their automation,
// and a decoded buffer's duration is the byte length of the data, so
// load_audio picks durations.

export interface MockSource {
  buffer: { duration: number } | null
  onended: (() => void) | null
  start_when: number | null
  start_offset: number | null
  stop_when: number | null
  connect: () => void
  disconnect: () => void
  start: (when: number, offset: number) => void
  stop: (when?: number) => void
}

export const create_mock_context = ({ hold_resume = false } = {}) => {
  const sources: MockSource[] = []
  const fade_events: Array<[string, number, number]> = []
  const pending_resumes: Array<() => void> = []
  let gains = 0
  const context = {
    currentTime: 0,
    destination: {},
    resume: async () => {
      if (hold_resume) await new Promise<void>((resolve) => { pending_resumes.push(resolve) })
    },
    createGain: () => {
      // The engine creates the fade gain first, then the volume gain.
      const record = gains++ === 0
      const param = {
        value: 1,
        setValueAtTime: (value: number, time: number) => { if (record) fade_events.push(['set', value, time]) },
        linearRampToValueAtTime: (value: number, time: number) => { if (record) fade_events.push(['ramp', value, time]) },
        cancelScheduledValues: (time: number) => { if (record) fade_events.push(['cancel', 0, time]) }
      }
      return { gain: param, connect: () => {} }
    },
    decodeAudioData: async (data: ArrayBuffer) => ({ duration: data.byteLength }),
    createBufferSource: () => {
      const source: MockSource = {
        buffer: null,
        onended: null,
        start_when: null,
        start_offset: null,
        stop_when: null,
        connect: () => {},
        disconnect: () => {},
        start: (when, offset) => {
          source.start_when = when
          source.start_offset = offset
        },
        stop: (when) => { source.stop_when = when ?? context.currentTime }
      }
      sources.push(source)
      return source
    }
  }
  const release_resumes = () => { for (const resolve of pending_resumes.splice(0)) resolve() }
  // Plays a source out: the clock reaches its end and onended fires.
  const finish = (source: MockSource | undefined) => {
    if (source === undefined) throw new Error('no such source')
    context.currentTime = (source.start_when ?? 0) - (source.start_offset ?? 0) + (source.buffer?.duration ?? 0)
    source.onended?.()
  }
  return { context, as_audio_context: context as unknown as AudioContext, sources, fade_events, release_resumes, finish }
}

export const sleep = async (ms = 5) => { await new Promise((resolve) => setTimeout(resolve, ms)) }
