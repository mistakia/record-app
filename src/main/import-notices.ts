// A system notification when an import finishes while the window is not in
// front: an import the browser extension or another client started, or one
// of this app's own left running. The renderer's toast covers the focused
// window. Built from the import:* events main already receives, so it needs
// no renderer. Imports nothing from Electron; index.ts supplies show.

import type { NodeEventMessage } from '#shared/bridge.ts'

export interface ImportNotice { title: string, body: string }

interface Progress { added: string[], errors: string[] }

// Imports a long-lived connection may see start and never finish.
const MAX_TRACKED = 50

const track_name = (track: unknown): string | null => {
  if (typeof track !== 'object' || track === null) return null
  const { title, artist } = track as { title?: unknown, artist?: unknown }
  if (typeof title !== 'string' || title === '') return null
  return typeof artist === 'string' && artist !== '' ? `${title} — ${artist}` : title
}

export const notice_for_import = ({ added, errors }: Progress): ImportNotice => {
  if (added.length === 0) {
    return { title: 'Import failed', body: errors[0] ?? 'The node added no track.' }
  }
  const named = added.length === 1 ? added[0] as string : `${added.length} tracks`
  return { title: 'Imported', body: errors.length === 0 ? named : `${named}. ${errors.length} failed: ${errors[0] as string}` }
}

export const create_import_notices = ({ show, window_focused }: {
  show: (notice: ImportNotice) => void
  window_focused: () => boolean
}): { on_event: (message: NodeEventMessage) => void } => {
  const imports = new Map<string, Progress>()
  const progress_of = (import_id: string): Progress => {
    let progress = imports.get(import_id)
    if (progress === undefined) {
      if (imports.size >= MAX_TRACKED) imports.delete(imports.keys().next().value as string)
      progress = { added: [], errors: [] }
      imports.set(import_id, progress)
    }
    return progress
  }
  return {
    on_event: ({ type, payload }) => {
      if (!type.startsWith('import:') || typeof payload.import_id !== 'string') return
      const progress = progress_of(payload.import_id)
      if (type === 'import:processed-file') {
        progress.added.push(track_name(payload.track) ?? 'an untitled track')
      } else if (type === 'import:error') {
        const error = payload.error as { error?: { message?: unknown } } | undefined
        progress.errors.push(typeof error?.error?.message === 'string' ? error.error.message : 'failed')
      } else if (type === 'import:finished') {
        imports.delete(payload.import_id)
        if (window_focused()) {
          console.info(`notice: import ${payload.import_id} finished with the window in front; the toast covers it`)
          return
        }
        show(notice_for_import(progress))
      }
    }
  }
}
