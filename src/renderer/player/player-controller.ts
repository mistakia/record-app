// The app's one audio engine, fed by the preload get_audio and mirrored into
// the player slice. Components act on playback only through these functions.

import { create_audio_engine } from './audio-engine.ts'
import { store } from '#renderer/store/index.ts'
import { engine_updated, track_selected } from '#renderer/store/player.ts'
import type { Track } from '#renderer/api/types.ts'

const engine = create_audio_engine({
  load_audio: async ({ cid }) => {
    const result = await window.record.get_audio({ cid })
    if (!result.ok) throw new Error(result.failure.message)
    return result.data
  }
})

engine.subscribe((snapshot) => { store.dispatch(engine_updated(snapshot)) })

export const play_track = (track: Track): void => {
  store.dispatch(track_selected({
    track_id: track.id,
    audio_cid: track.audio_cid,
    title: track.title ?? null,
    artist: track.artist ?? null,
    duration_seconds: track.duration_seconds ?? null
  }))
  engine.play({ cid: track.audio_cid }).catch(() => {})
}

export const toggle_playback = (): void => {
  const { state } = engine.get_snapshot()
  if (state === 'playing') {
    engine.pause()
    return
  }
  // Nothing loaded yet, as after a restore or an error: load the cued track
  // and start where it left off.
  const { track, position_seconds } = store.getState().player
  if ((state === 'idle' || state === 'error') && track !== null) {
    engine.play({ cid: track.audio_cid, start_at: position_seconds }).catch(() => {})
    return
  }
  engine.resume().catch(() => {})
}

export const seek_playback = (position_seconds: number): void => { engine.seek(position_seconds) }

export const set_playback_volume = (volume: number): void => { engine.set_volume(volume) }

// Part of the teardown on a node switch: nothing keeps playing from the old node.
export const stop_playback = (): void => {
  engine.stop()
  store.dispatch(track_selected(null))
}
