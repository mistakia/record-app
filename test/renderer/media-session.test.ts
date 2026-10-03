import { describe, expect, test } from 'bun:test'

import { create_silent_wav, install_media_session } from '#renderer/player/media-session.ts'

const create_fake_session = () => {
  const handlers = new Map<string, ((details: Record<string, unknown>) => void) | null>()
  const positions: unknown[] = []
  const session = {
    metadata: null as unknown,
    playbackState: 'none',
    setActionHandler: (action: string, handler: ((details: Record<string, unknown>) => void) | null) => { handlers.set(action, handler) },
    setPositionState: (state: unknown) => { positions.push(state) }
  }
  return { session, handlers, positions }
}

// The browser globals install_media_session touches, as minimal fakes.
const audio_elements: Array<{ paused: boolean }> = []
Object.assign(globalThis, {
  MediaMetadata: class {
    title: string
    artist: string
    constructor ({ title, artist }: { title: string, artist: string }) {
      this.title = title
      this.artist = artist
    }
  },
  Audio: class {
    paused = true
    loop = false
    src: string
    constructor (src: string) {
      this.src = src
      audio_elements.push(this)
    }

    async play () { this.paused = false }
    pause () { this.paused = true }
  }
})

describe('create_silent_wav', () => {
  test('is a valid 10 s mono 8-bit PCM WAV of silence', () => {
    const wav = create_silent_wav()
    const view = new DataView(wav.buffer)
    expect(new TextDecoder().decode(wav.subarray(0, 4))).toBe('RIFF')
    expect(new TextDecoder().decode(wav.subarray(8, 12))).toBe('WAVE')
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(8000)
    expect(view.getUint32(40, true)).toBe(80000)
    expect(wav.length).toBe(44 + 80000)
    expect(wav.subarray(44).every((sample) => sample === 128)).toBe(true)
  })
})

describe('install_media_session', () => {
  test('routes every system control to the player actions', () => {
    const { session, handlers } = create_fake_session()
    const calls: string[] = []
    install_media_session({
      media_session: session as unknown as MediaSession,
      actions: {
        play: () => { calls.push('play') },
        pause: () => { calls.push('pause') },
        next: () => { calls.push('next') },
        previous: () => { calls.push('previous') },
        stop: () => { calls.push('stop') },
        seek_to: (position) => { calls.push(`seek_to ${position}`) },
        seek_by: (offset) => { calls.push(`seek_by ${offset}`) }
      }
    })
    for (const action of ['play', 'pause', 'nexttrack', 'previoustrack', 'stop']) handlers.get(action)?.({})
    handlers.get('seekto')?.({ seekTime: 42 })
    handlers.get('seekforward')?.({})
    handlers.get('seekbackward')?.({ seekOffset: 5 })
    expect(calls).toEqual(['play', 'pause', 'next', 'previous', 'stop', 'seek_to 42', 'seek_by 10', 'seek_by -5'])
  })

  test('publishes metadata, playback and position state, and runs the keep-alive element only while playing', () => {
    const { session, positions } = create_fake_session()
    const noop = () => {}
    const media = install_media_session({
      media_session: session as unknown as MediaSession,
      actions: { play: noop, pause: noop, next: noop, previous: noop, stop: noop, seek_to: noop, seek_by: noop }
    })
    const keep_alive = audio_elements.at(-1)
    media.update({ title: 'Intro', artist: 'SebastiAn', playing: true, has_track: true, position_seconds: 3, duration_seconds: 51 })
    expect(session.metadata).toMatchObject({ title: 'Intro', artist: 'SebastiAn' })
    expect(session.playbackState).toBe('playing')
    expect(positions.at(-1)).toEqual({ duration: 51, position: 3, playbackRate: 1 })
    expect(keep_alive?.paused).toBe(false)
    media.update({ title: 'Intro', artist: 'SebastiAn', playing: false, has_track: true, position_seconds: 9, duration_seconds: 51 })
    expect(session.playbackState).toBe('paused')
    expect(keep_alive?.paused).toBe(true)
    media.update({ title: null, artist: null, playing: false, has_track: false, position_seconds: 0, duration_seconds: 0 })
    expect(session.metadata).toBeNull()
    expect(session.playbackState).toBe('none')
  })
})
