// Ingest progress (spec §8.9.1): one entry per import, built from the
// import:* events, which carry the import_id the request returned. Events
// may arrive before the request resolves, so either can create the entry.
// Each action is stamped with the time it was made (meta.at), so the page
// can show an import's age without the reducer reading the clock.

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { NodeEventMessage } from '#shared/bridge.ts'

// A failed file, by its position in the batch: the node names it by its
// temp upload path, so the name the user chose is looked up by position.
export interface ImportError {
  position: number
  file_path: string
  message: string
}

export interface ImportProgress {
  import_id: string
  label: string
  file_count: number | null
  // The names the files were sent under, in batch order; empty for a URL.
  file_names: string[]
  // Files the node has finished with, failed ones included (its `completed`).
  settled: number
  added: string[]
  errors: ImportError[]
  finished: boolean
  started_at: number
  finished_at: number | null
}

interface Requested { import_id: string, label: string, file_count: number | null, file_names?: string[] | undefined }

const MAX_IMPORTS = 50

const blank = (import_id: string, label: string, at: number): ImportProgress =>
  ({ import_id, label, file_count: null, file_names: [], settled: 0, added: [], errors: [], finished: false, started_at: at, finished_at: null })

// Only the last segment of a node-side temp path or URL is worth showing.
const short_name = (value: unknown): string => typeof value === 'string' ? value.split(/[\\/]/).filter(Boolean).at(-1) ?? value : 'a file'

// A failed file's line: the name it was sent under, then why it failed.
export const error_line = (item: ImportProgress, { position, file_path, message }: ImportError): string =>
  `${item.file_names[position] ?? short_name(file_path)}: ${message}`

const stamped = <P>(payload: P, at: number = Date.now()) => ({ payload, meta: { at } })

export const imports_slice = createSlice({
  name: 'imports',
  initialState: { items: [] as ImportProgress[] },
  reducers: {
    import_requested: {
      reducer: (state, action: PayloadAction<Requested, string, { at: number }>) => {
        const { import_id, label, file_count, file_names = [] } = action.payload
        const existing = state.items.find((item) => item.import_id === import_id)
        if (existing !== undefined) {
          existing.label = label
          existing.file_count ??= file_count
          existing.file_names = file_names
          return
        }
        state.items = [{ ...blank(import_id, label, action.meta.at), file_count, file_names }, ...state.items].slice(0, MAX_IMPORTS)
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
          const position = item.settled
          item.settled = typeof payload.completed === 'number' ? payload.completed : item.settled + 1
          const track = payload.track as { title?: unknown } | undefined
          item.added.push(typeof track?.title === 'string' ? track.title : item.file_names[position] ?? short_name(payload.file_path))
        } else if (type === 'import:error') {
          const error = payload.error as { error?: { message?: unknown } } | undefined
          const message = typeof error?.error?.message === 'string' ? error.error.message : 'failed'
          // Files settle one at a time, in order, so this one is the next.
          item.errors.push({ position: item.settled, file_path: typeof payload.file_path === 'string' ? payload.file_path : '', message })
          item.settled += 1
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
