// The saved connection, as main reports it. `config` is null until the first
// connection.get resolves.

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { ConnectionConfig } from '#shared/bridge.ts'

interface ConnectionState {
  config: ConnectionConfig | null
}

const initial_state: ConnectionState = { config: null }

export const connection_slice = createSlice({
  name: 'connection',
  initialState: initial_state,
  reducers: {
    connection_loaded: (state, action: PayloadAction<ConnectionConfig>) => {
      state.config = action.payload
    }
  }
})

export const { connection_loaded } = connection_slice.actions
