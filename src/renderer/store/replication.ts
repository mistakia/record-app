// Live library state that only events carry: replication progress between
// refetches (library:replicate-progress), whether replication is connected
// (chapter 7's Library has no such field), and which libraries were just
// linked, so a fresh link shows as replicating rather than empty (spec
// §8.6.5). Progress is stamped with when it arrived so newer server data
// wins, and is dropped once a batch completes or a reconcile refetches.

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { NodeEventMessage } from '#shared/bridge.ts'

export interface LiveProgress {
  progress: number
  total: number
  received_at: number
}

interface ReplicationState {
  progress: Record<string, LiveProgress>
  connected: Record<string, boolean>
  // Library address to when it was linked here.
  linked_at: Record<string, number>
}

const initial_state: ReplicationState = { progress: {}, connected: {}, linked_at: {} }

const address_of = (payload: Record<string, unknown>): string | null =>
  typeof payload.library_address === 'string' ? payload.library_address : null

export const replication_slice = createSlice({
  name: 'replication',
  initialState: initial_state,
  reducers: {
    library_event_received: {
      reducer: (state, action: PayloadAction<NodeEventMessage & { received_at: number }>) => {
        const { type, payload, received_at } = action.payload
        const address = address_of(payload)
        if (address === null) return
        if (type === 'library:replicate-progress' && typeof payload.progress === 'number' && typeof payload.total === 'number') {
          state.progress[address] = { progress: payload.progress, total: payload.total, received_at }
        } else if (type === 'library:replicated') {
          delete state.progress[address]
        } else if (type === 'library:connected' || type === 'library:disconnected') {
          state.connected[address] = type === 'library:connected'
        } else if (type === 'library:unlinked') {
          delete state.progress[address]
          delete state.connected[address]
          delete state.linked_at[address]
        }
      },
      prepare: (message: NodeEventMessage, received_at = Date.now()) => ({ payload: { ...message, received_at } })
    },
    library_linked: {
      reducer: (state, action: PayloadAction<{ address: string, at: number }>) => {
        state.linked_at[action.payload.address] = action.payload.at
      },
      prepare: (address: string, at = Date.now()) => ({ payload: { address, at } })
    },
    // A reconcile refetches every library, so event progress is stale.
    live_progress_cleared: (state) => {
      state.progress = {}
    },
    // Set when the user asks; the node confirms with an event.
    library_connection_requested: (state, action: PayloadAction<{ address: string, connected: boolean }>) => {
      state.connected[action.payload.address] = action.payload.connected
    },
    // A new node has none of the old one's libraries.
    replication_reset: () => initial_state
  }
})

export const { library_event_received, library_linked, library_connection_requested, live_progress_cleared, replication_reset } = replication_slice.actions
