// Live library state that only events carry: replication progress between
// refetches (library:replicate-progress), whether replication is connected
// (chapter 7's Library has no such field), and which libraries were linked
// in this session, so a fresh link shows as replicating rather than empty
// (spec §8.6.5).

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { NodeEventMessage } from '#shared/bridge.ts'

interface ReplicationState {
  progress: Record<string, { progress: number, total: number }>
  connected: Record<string, boolean>
  recently_linked: string[]
}

const initial_state: ReplicationState = { progress: {}, connected: {}, recently_linked: [] }

const address_of = (payload: Record<string, unknown>): string | null =>
  typeof payload.library_address === 'string' ? payload.library_address : null

export const replication_slice = createSlice({
  name: 'replication',
  initialState: initial_state,
  reducers: {
    library_event_received: (state, action: PayloadAction<NodeEventMessage>) => {
      const { type, payload } = action.payload
      const address = address_of(payload)
      if (address === null) return
      if (type === 'library:replicate-progress' && typeof payload.progress === 'number' && typeof payload.total === 'number') {
        state.progress[address] = { progress: payload.progress, total: payload.total }
      } else if (type === 'library:connected' || type === 'library:disconnected') {
        state.connected[address] = type === 'library:connected'
      } else if (type === 'library:unlinked') {
        delete state.progress[address]
        delete state.connected[address]
        state.recently_linked = state.recently_linked.filter((linked) => linked !== address)
      }
    },
    library_linked: (state, action: PayloadAction<string>) => {
      if (!state.recently_linked.includes(action.payload)) state.recently_linked.push(action.payload)
    },
    // Set when the user asks; the node confirms with an event.
    library_connection_requested: (state, action: PayloadAction<{ address: string, connected: boolean }>) => {
      state.connected[action.payload.address] = action.payload.connected
    },
    // A new node has none of the old one's libraries.
    replication_reset: () => initial_state
  }
})

export const { library_event_received, library_linked, library_connection_requested, replication_reset } = replication_slice.actions
