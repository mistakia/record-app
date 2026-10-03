// Layer C choices that shape what is on screen (spec §8.8.4).

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface UiState {
  // The library the track list shows; '' is all libraries.
  library_address: string
}

const initial_state: UiState = { library_address: '' }

export const ui_slice = createSlice({
  name: 'ui',
  initialState: initial_state,
  reducers: {
    library_selected: (state, action: PayloadAction<string>) => {
      state.library_address = action.payload
    }
  }
})

export const { library_selected } = ui_slice.actions
