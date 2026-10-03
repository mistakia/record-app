// Player state mirrored from the audio engine, which owns playback itself.

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { EngineSnapshot } from '#renderer/player/audio-engine.ts'
import type { SnapshotQueueEntry } from '#shared/snapshot.ts'

export type NowPlaying = SnapshotQueueEntry

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
    engine_updated: (state, action: PayloadAction<EngineSnapshot>) => ({ ...state, ...action.payload }),
    // From the hibernation snapshot: the track is cued at its position, not loaded.
    player_restored: (state, action: PayloadAction<{ track: NowPlaying, position_seconds: number }>) => {
      state.track = action.payload.track
      state.position_seconds = action.payload.position_seconds
      state.duration_seconds = action.payload.track.duration_seconds ?? 0
    }
  }
})

export const { track_selected, engine_updated, player_restored } = player_slice.actions
