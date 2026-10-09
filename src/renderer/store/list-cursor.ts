// The track list's keyboard state (STYLE.md § Keyboard Model): one cursor
// row, an anchor for range selection, and the selected rows, by position in
// the current view. A new view (another library, search, sort) starts over.

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface ListCursorState {
  view_key: string
  cursor: number
  anchor: number
  selected: number[]
}

const initial_state: ListCursorState = { view_key: '', cursor: 0, anchor: 0, selected: [] }

const clamp = (index: number, total: number): number => Math.min(Math.max(index, 0), Math.max(total - 1, 0))

const range = (from: number, to: number): number[] => {
  const low = Math.min(from, to)
  return Array.from({ length: Math.abs(to - from) + 1 }, (_, offset) => low + offset)
}

export const list_cursor_slice = createSlice({
  name: 'list_cursor',
  initialState: initial_state,
  reducers: {
    view_entered: (state, action: PayloadAction<string>) => {
      if (state.view_key === action.payload) return
      return { ...initial_state, view_key: action.payload }
    },
    // Moves the cursor; with extend, the selection becomes the range from the
    // anchor to the new cursor.
    cursor_moved: (state, action: PayloadAction<{ to: number, total: number, extend?: boolean }>) => {
      const { to, total, extend = false } = action.payload
      state.cursor = clamp(to, total)
      if (extend) state.selected = range(state.anchor, state.cursor)
      else state.anchor = state.cursor
    },
    // A click on a row: the cursor lands there; with toggle (Cmd or x) the row
    // joins or leaves the selection, with extend (Shift) the range does.
    row_clicked: (state, action: PayloadAction<{ index: number, toggle?: boolean, extend?: boolean }>) => {
      const { index, toggle = false, extend = false } = action.payload
      state.cursor = index
      if (extend) {
        state.selected = range(state.anchor, index)
        return
      }
      state.anchor = index
      if (toggle) state.selected = state.selected.includes(index) ? state.selected.filter((item) => item !== index) : [...state.selected, index].sort((a, b) => a - b)
    },
    selection_toggled: (state) => {
      const { cursor } = state
      state.selected = state.selected.includes(cursor) ? state.selected.filter((item) => item !== cursor) : [...state.selected, cursor].sort((a, b) => a - b)
      state.anchor = cursor
    },
    selection_cleared: (state) => {
      state.selected = []
      state.anchor = state.cursor
    }
  }
})

export const { view_entered, cursor_moved, row_clicked, selection_toggled, selection_cleared } = list_cursor_slice.actions

// The rows an action applies to: the selection, else the cursor row.
export const action_rows = (state: ListCursorState): number[] => state.selected.length > 0 ? state.selected : [state.cursor]
