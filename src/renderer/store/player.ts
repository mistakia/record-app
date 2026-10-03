// Player state: the engine's snapshot mirrored in, and the queue. The
// player controller is the only writer; components read.

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { EngineSnapshot } from '#renderer/player/audio-engine.ts'
import { EMPTY_QUEUE, type QueueState } from '#renderer/player/queue-manager.ts'

interface PlayerState extends EngineSnapshot {
  queue: QueueState
}

const initial_state: PlayerState = {
  state: 'idle',
  key: null,
  play_id: 0,
  position_seconds: 0,
  duration_seconds: 0,
  played_seconds: 0,
  volume: 1,
  error: null,
  queue: EMPTY_QUEUE
}

export const player_slice = createSlice({
  name: 'player',
  initialState: initial_state,
  reducers: {
    engine_updated: (state, action: PayloadAction<EngineSnapshot>) => ({ ...state, ...action.payload }),
    queue_changed: (state, action: PayloadAction<QueueState>) => {
      state.queue = action.payload
    },
    // From the hibernation snapshot: the current entry is cued at its
    // position, not loaded.
    player_restored: (state, action: PayloadAction<{ queue: QueueState, position_seconds: number }>) => {
      const { queue, position_seconds } = action.payload
      state.queue = queue
      state.position_seconds = position_seconds
      state.duration_seconds = queue.entries[queue.index]?.duration_seconds ?? 0
    },
    // A seek before the cued track has loaded: where play will start.
    cued_position_changed: (state, action: PayloadAction<number>) => {
      state.position_seconds = Math.min(Math.max(action.payload, 0), state.duration_seconds)
    }
  }
})

export const { cued_position_changed, engine_updated, queue_changed, player_restored } = player_slice.actions
