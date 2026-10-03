// Layer C choices that shape what is on screen (spec §8.8.4): which library
// the track list shows and how it is searched, filtered, and sorted.

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import { DEFAULT_TRACK_FILTERS, type SortOrder, type TrackFilters, type TrackSort } from './api.ts'

interface UiState {
  // The library the track list shows; '' is all libraries.
  library_address: string
  filters: TrackFilters
}

const initial_state: UiState = { library_address: '', filters: DEFAULT_TRACK_FILTERS }

export const ui_slice = createSlice({
  name: 'ui',
  initialState: initial_state,
  reducers: {
    // Tags are per library, so a selection does not carry across libraries.
    library_selected: (state, action: PayloadAction<string>) => {
      if (state.library_address !== action.payload) state.filters.tags = []
      state.library_address = action.payload
    },
    query_changed: (state, action: PayloadAction<string>) => {
      state.filters.query = action.payload
    },
    sort_changed: (state, action: PayloadAction<{ sort: TrackSort, order: SortOrder }>) => {
      state.filters.sort = action.payload.sort
      state.filters.order = action.payload.order
    },
    tag_toggled: (state, action: PayloadAction<string>) => {
      const { tags } = state.filters
      state.filters.tags = tags.includes(action.payload) ? tags.filter((tag) => tag !== action.payload) : [...tags, action.payload]
    },
    filters_cleared: (state) => {
      state.filters = { ...DEFAULT_TRACK_FILTERS, sort: state.filters.sort, order: state.filters.order }
    }
  }
})

export const { library_selected, query_changed, sort_changed, tag_toggled, filters_cleared } = ui_slice.actions
