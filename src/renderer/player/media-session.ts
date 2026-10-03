// OS media integration (spec §8.9.1) through the Media Session API: Now
// Playing metadata for Control Center and the lock screen, playback and
// position state, and play, pause, next, previous, and seek from system
// controls and the keyboard media keys.
//
// Chromium only hands a page's media session to the OS while a media element
// is playing; Web Audio alone does not count. So a looping element playing
// generated silence runs while the engine plays and pauses with it. It is
// longer than 5 s, below which Chromium treats media as transient and keeps
// it out of the session.

export interface MediaSessionActions {
  play: () => void
  pause: () => void
  next: () => void
  previous: () => void
  seek_to: (position_seconds: number) => void
  seek_by: (offset_seconds: number) => void
  stop: () => void
}

export interface MediaSessionState {
  title: string | null
  artist: string | null
  playing: boolean
  has_track: boolean
  position_seconds: number
  duration_seconds: number
}

const SILENCE_SECONDS = 10
const SILENCE_SAMPLE_RATE = 8000
const SEEK_STEP_SECONDS = 10

// A mono 8-bit PCM WAV of silence (8-bit PCM is unsigned, so silence is 128).
export const create_silent_wav = ({ seconds = SILENCE_SECONDS, sample_rate = SILENCE_SAMPLE_RATE } = {}): Uint8Array<ArrayBuffer> => {
  const samples = seconds * sample_rate
  const bytes = new Uint8Array(44 + samples)
  const view = new DataView(bytes.buffer)
  const ascii = (offset: number, text: string) => { for (let index = 0; index < text.length; index++) bytes[offset + index] = text.charCodeAt(index) }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + samples, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sample_rate, true)
  view.setUint32(28, sample_rate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  ascii(36, 'data')
  view.setUint32(40, samples, true)
  bytes.fill(128, 44)
  return bytes
}

export const install_media_session = ({ actions, media_session = navigator.mediaSession }: {
  actions: MediaSessionActions
  media_session?: MediaSession
}) => {
  const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
    ['play', () => { actions.play() }],
    ['pause', () => { actions.pause() }],
    ['nexttrack', () => { actions.next() }],
    ['previoustrack', () => { actions.previous() }],
    ['stop', () => { actions.stop() }],
    ['seekto', (details) => { if (details.seekTime !== undefined) actions.seek_to(details.seekTime) }],
    ['seekforward', (details) => { actions.seek_by(details.seekOffset ?? SEEK_STEP_SECONDS) }],
    ['seekbackward', (details) => { actions.seek_by(-(details.seekOffset ?? SEEK_STEP_SECONDS)) }]
  ]
  for (const [action, handler] of handlers) media_session.setActionHandler(action, handler)

  const keep_alive = new Audio(URL.createObjectURL(new Blob([create_silent_wav()], { type: 'audio/wav' })))
  keep_alive.loop = true
  let last_metadata = ''

  return {
    update: (state: MediaSessionState): void => {
      const metadata_key = JSON.stringify([state.has_track, state.title, state.artist])
      if (metadata_key !== last_metadata) {
        last_metadata = metadata_key
        // Values from the node go to the OS as plain strings.
        media_session.metadata = state.has_track ? new MediaMetadata({ title: state.title ?? 'Untitled', artist: state.artist ?? '' }) : null
      }
      media_session.playbackState = !state.has_track ? 'none' : state.playing ? 'playing' : 'paused'
      if (state.duration_seconds > 0) {
        media_session.setPositionState({
          duration: state.duration_seconds,
          position: Math.min(state.position_seconds, state.duration_seconds),
          playbackRate: 1
        })
      }
      if (state.playing && keep_alive.paused) keep_alive.play().catch(() => {})
      if (!state.playing && !keep_alive.paused) keep_alive.pause()
    },
    uninstall: (): void => {
      for (const [action] of handlers) media_session.setActionHandler(action, null)
      keep_alive.pause()
      URL.revokeObjectURL(keep_alive.src)
    }
  }
}
