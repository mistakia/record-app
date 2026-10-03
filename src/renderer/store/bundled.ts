// The bundled node as main reports it (spec §8.4).

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { BundledState } from '#shared/bridge.ts'

export const bundled_slice = createSlice({
  name: 'bundled',
  initialState: { state: null as BundledState | null },
  reducers: {
    bundled_state_changed: (state, action: PayloadAction<BundledState>) => {
      state.state = action.payload
    }
  }
})

export const { bundled_state_changed } = bundled_slice.actions
