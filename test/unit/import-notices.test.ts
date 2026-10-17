import { describe, expect, test } from 'bun:test'

import { create_import_notices, type ImportNotice } from '#main/import-notices.ts'
import type { NodeEventMessage } from '#shared/bridge.ts'

const event = (type: string, payload: Record<string, unknown>): NodeEventMessage => ({ type, payload }) as NodeEventMessage

const harness = (focused = false) => {
  const shown: ImportNotice[] = []
  const notices = create_import_notices({ show: (notice) => shown.push(notice), window_focused: () => focused })
  return { shown, on_event: notices.on_event }
}

describe('import notices', () => {
  test('a finished import names its track while the window is not in front', () => {
    const { shown, on_event } = harness()
    on_event(event('import:starting', { import_id: 'a', source: 'url', file_count: 1 }))
    on_event(event('import:processed-file', { import_id: 'a', track: { title: 'backseat', artist: 'Fred again..' } }))
    expect(shown).toEqual([])
    on_event(event('import:finished', { import_id: 'a', track_count: 1, error_count: 0 }))
    expect(shown).toEqual([{ title: 'Imported', body: 'backseat — Fred again..' }])
  })

  test('a failed import carries the node\'s reason', () => {
    const { shown, on_event } = harness()
    on_event(event('import:error', { import_id: 'b', error: { error: { code: 'INTERNAL_ERROR', message: 'download_failed: aborted' } } }))
    on_event(event('import:finished', { import_id: 'b', track_count: 0, error_count: 1 }))
    expect(shown).toEqual([{ title: 'Import failed', body: 'download_failed: aborted' }])
  })

  test('a batch counts its tracks and its failures, and an untitled track says so', () => {
    const { shown, on_event } = harness()
    on_event(event('import:processed-file', { import_id: 'c', track: { title: null } }))
    on_event(event('import:processed-file', { import_id: 'c', track: { title: 'Two' } }))
    on_event(event('import:error', { import_id: 'c', error: { error: { message: 'no_audio' } } }))
    on_event(event('import:finished', { import_id: 'c' }))
    expect(shown).toEqual([{ title: 'Imported', body: '2 tracks. 1 failed: no_audio' }])
    on_event(event('import:processed-file', { import_id: 'd', track: { title: null } }))
    on_event(event('import:finished', { import_id: 'd' }))
    expect(shown.at(-1)).toEqual({ title: 'Imported', body: 'an untitled track' })
  })

  test('the focused window shows its own toast instead, and other events are ignored', () => {
    const { shown, on_event } = harness(true)
    on_event(event('import:finished', { import_id: 'e' }))
    on_event(event('library:index-updated', { library_address: '/record/x/record' }))
    expect(shown).toEqual([])
  })
})
