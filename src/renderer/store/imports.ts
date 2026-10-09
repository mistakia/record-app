// Ingest progress (spec §8.9.1): one entry per import, built from the
// import:* events, which carry the import_id the request returned. Events
// may arrive before the request resolves, so either can create the entry.
// Each action is stamped with the time it was made (meta.at), so the page
// can show an import's age without the reducer reading the clock.

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
  started_at: number
  finished_at: number | null
}

interface Requested { import_id: string, label: string, file_count: number | null }

const MAX_IMPORTS = 50

const blank = (import_id: string, label: string, at: number): ImportProgress =>
  ({ import_id, label, file_count: null, completed: 0, added: [], errors: [], finished: false, started_at: at, finished_at: null })

// Only the last segment of a node-side temp path or URL is worth showing.
const short_name = (value: unknown): string => typeof value === 'string' ? value.split(/[\\/]/).filter(Boolean).at(-1) ?? value : 'a file'

const stamped = <P>(payload: P, at: number = Date.now()) => ({ payload, meta: { at } })

export const imports_slice = createSlice({
  name: 'imports',
  initialState: { items: [] as ImportProgress[] },
  reducers: {
    import_requested: {
      reducer: (state, action: PayloadAction<Requested, string, { at: number }>) => {
        const { import_id, label, file_count } = action.payload
        const existing = state.items.find((item) => item.import_id === import_id)
        if (existing !== undefined) {
          existing.label = label
          existing.file_count ??= file_count
          return
        }
        state.items = [{ ...blank(import_id, label, action.meta.at), file_count }, ...state.items].slice(0, MAX_IMPORTS)
      },
      prepare: (payload: Requested, at?: number) => stamped(payload, at)
    },
    import_event_received: {
      reducer: (state, action: PayloadAction<NodeEventMessage, string, { at: number }>) => {
        const { type, payload } = action.payload
        if (typeof payload.import_id !== 'string') return
        let item = state.items.find(({ import_id }) => import_id === payload.import_id)
        if (item === undefined) {
          item = blank(payload.import_id, 'Import', action.meta.at)
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
          item.finished_at = action.meta.at
        }
      },
      prepare: (payload: NodeEventMessage, at?: number) => stamped(payload, at)
    },
    // The history's [clear]: drops every finished import, keeps the running ones.
    finished_imports_cleared: (state) => {
      state.items = state.items.filter(({ finished }) => !finished)
    }
  }
})

export const { import_requested, import_event_received, finished_imports_cleared } = imports_slice.actions
