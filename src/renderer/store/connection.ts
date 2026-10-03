// The saved connection as main reports it, the event connection's state, and
// how fresh the rendered node data is (spec §8.8.5). Data is stale until the
// first refetch after each (re)connect completes; writes wait for fresh.

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { ConnectionView, EventsState } from '#shared/bridge.ts'

export type Freshness = 'stale' | 'reconciling' | 'fresh'

export interface ConnectionState {
  // Null until the first connection.get resolves.
  config: ConnectionView | null
  events: EventsState | null
  freshness: Freshness
  reconciled_connection_id: number
}

const initial_state: ConnectionState = { config: null, events: null, freshness: 'stale', reconciled_connection_id: 0 }

export const connection_slice = createSlice({
  name: 'connection',
  initialState: initial_state,
  reducers: {
    connection_loaded: (state, action: PayloadAction<ConnectionView>) => {
      state.config = action.payload
    },
    events_state_changed: (state, action: PayloadAction<EventsState>) => {
      const previous_connection_id = state.events?.connection_id
      state.events = action.payload
      // Data is stale while disconnected, and again on every new connection
      // until that connection's own reconcile finishes.
      if (action.payload.status !== 'open' || action.payload.connection_id !== previous_connection_id) state.freshness = 'stale'
    },
    // A saved connection is about to replace the current one: nothing shown
    // is fresh and no write may pass until the new connection reconciles.
    node_switch_started: (state) => {
      if (state.events !== null) state.events = { ...state.events, status: 'connecting', retry_at_ms: null }
      state.freshness = 'stale'
    },
    reconcile_started: (state, action: PayloadAction<{ connection_id: number }>) => {
      if (state.events?.connection_id === action.payload.connection_id) state.freshness = 'reconciling'
    },
    reconcile_finished: (state, action: PayloadAction<{ connection_id: number, ok: boolean }>) => {
      // A result for a connection that has since dropped or been replaced is ignored.
      if (state.events?.status !== 'open' || state.events.connection_id !== action.payload.connection_id) return
      state.freshness = action.payload.ok ? 'fresh' : 'stale'
      if (action.payload.ok) state.reconciled_connection_id = action.payload.connection_id
    }
  }
})

export const { connection_loaded, events_state_changed, node_switch_started, reconcile_started, reconcile_finished } = connection_slice.actions

// Spec §8.8.3: writes are gated until reconciliation completes.
export const select_writes_allowed = (state: { connection: ConnectionState }): boolean =>
  state.connection.events?.status === 'open' && state.connection.freshness === 'fresh'
