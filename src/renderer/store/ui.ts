// Layer C choices that shape what is on screen (spec §8.8.4): which library
// the track list shows and how it is searched, filtered, and sorted.

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import { DEFAULT_TRACK_FILTERS, type TrackFilters } from './api.ts'

interface UiState {
  // The library the track list shows; '' is all libraries.
  library_address: string
  filters: TrackFilters
  // The library last written to, the default write target (spec §8.6.3).
  recent_write_target: string | null
  // The queue overlay over the page column.
  queue_open: boolean
  // The ? shortcut overlay.
  shortcuts_open: boolean
  // The g lead: the next key goes to a page or a sidebar library.
  lead_open: boolean
  // The page's help popover.
  help_open: boolean
}

const initial_state: UiState = { library_address: '', filters: DEFAULT_TRACK_FILTERS, recent_write_target: null, queue_open: false, shortcuts_open: false, lead_open: false, help_open: false }

export const ui_slice = createSlice({
  name: 'ui',
  initialState: initial_state,
  reducers: {
    // The track list's view as its route holds it (routes.ts), mirrored here
    // for the hibernation snapshot and the write-target default.
    view_changed: (state, action: PayloadAction<{ library_address: string, filters: TrackFilters }>) => {
      state.library_address = action.payload.library_address
      state.filters = action.payload.filters
    },
    // Tags are per library, so a selection does not carry across libraries.
    library_selected: (state, action: PayloadAction<string>) => {
      if (state.library_address !== action.payload) state.filters.tags = []
      state.library_address = action.payload
    },
    write_target_used: (state, action: PayloadAction<string>) => {
      state.recent_write_target = action.payload
    },
    queue_toggled: (state, action: PayloadAction<boolean | undefined>) => {
      state.queue_open = action.payload ?? !state.queue_open
    },
    shortcuts_toggled: (state, action: PayloadAction<boolean | undefined>) => {
      state.shortcuts_open = action.payload ?? !state.shortcuts_open
    },
    lead_toggled: (state, action: PayloadAction<boolean>) => {
      state.lead_open = action.payload
    },
    help_toggled: (state, action: PayloadAction<boolean | undefined>) => {
      state.help_open = action.payload ?? !state.help_open
    }
  }
})

export const { view_changed, library_selected, write_target_used, queue_toggled, shortcuts_toggled, lead_toggled, help_toggled } = ui_slice.actions
