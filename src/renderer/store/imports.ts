// Ingest progress (spec §8.9.1): one entry per import, built from the
// import:* events, which carry the import_id the request returned. Events
// may arrive before the request resolves, so either can create the entry.

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { NodeEventMessage } from '#shared/bridge.ts'

export interface ImportProgress {
  import_id: string
  label: string
  file_count: number | null
  completed: number
  added: string[]
  errors: string[]
  finished: boolean
}

const MAX_IMPORTS = 50

const blank = (import_id: string, label: string): ImportProgress =>
  ({ import_id, label, file_count: null, completed: 0, added: [], errors: [], finished: false })

// Only the last segment of a node-side temp path or URL is worth showing.
const short_name = (value: unknown): string => typeof value === 'string' ? value.split(/[\\/]/).filter(Boolean).at(-1) ?? value : 'a file'

export const imports_slice = createSlice({
  name: 'imports',
  initialState: { items: [] as ImportProgress[] },
  reducers: {
    import_requested: (state, action: PayloadAction<{ import_id: string, label: string, file_count: number | null }>) => {
      const { import_id, label, file_count } = action.payload
      const existing = state.items.find((item) => item.import_id === import_id)
      if (existing !== undefined) {
        existing.label = label
        existing.file_count ??= file_count
        return
      }
      state.items = [{ ...blank(import_id, label), file_count }, ...state.items].slice(0, MAX_IMPORTS)
    },
    import_event_received: (state, action: PayloadAction<NodeEventMessage>) => {
      const { type, payload } = action.payload
      if (typeof payload.import_id !== 'string') return
      let item = state.items.find(({ import_id }) => import_id === payload.import_id)
      if (item === undefined) {
        item = blank(payload.import_id, 'Import')
        state.items = [item, ...state.items].slice(0, MAX_IMPORTS)
        item = state.items[0] as ImportProgress
      }
      if (type === 'import:starting' && typeof payload.file_count === 'number') {
        item.file_count = payload.file_count
      } else if (type === 'import:processed-file') {
        item.completed = typeof payload.completed === 'number' ? payload.completed : item.completed + 1
        const track = payload.track as { title?: unknown } | undefined
        item.added.push(typeof track?.title === 'string' ? track.title : short_name(payload.file_path))
      } else if (type === 'import:error') {
        const error = payload.error as { error?: { message?: unknown } } | undefined
        const message = typeof error?.error?.message === 'string' ? error.error.message : 'failed'
        item.errors.push(`${short_name(payload.file_path)}: ${message}`)
      } else if (type === 'import:finished') {
        item.finished = true
      }
    }
  }
})

export const { import_requested, import_event_received } = imports_slice.actions
