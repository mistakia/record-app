// Player state mirrored from the audio engine, which owns playback itself.

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { EngineSnapshot } from '#renderer/player/audio-engine.ts'

export interface NowPlaying {
  track_id: string
  audio_cid: string
  title: string | null
  artist: string | null
}

interface PlayerState extends EngineSnapshot {
  track: NowPlaying | null
}

const initial_state: PlayerState = {
  track: null,
  state: 'idle',
  position_seconds: 0,
  duration_seconds: 0,
  volume: 1,
  error: null
}

export const player_slice = createSlice({
  name: 'player',
  initialState: initial_state,
  reducers: {
    track_selected: (state, action: PayloadAction<NowPlaying | null>) => {
      state.track = action.payload
    },
    engine_updated: (state, action: PayloadAction<EngineSnapshot>) => ({ ...state, ...action.payload })
  }
})

export const { track_selected, engine_updated } = player_slice.actions
