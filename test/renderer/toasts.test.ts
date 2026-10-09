import { describe, expect, test } from 'bun:test'

import type { Library } from '#renderer/api/types.ts'
import { run_toast_action } from '#renderer/components/common/toaster.tsx'
import { node_api } from '#renderer/store/api.ts'
import { notice_for_event } from '#renderer/store/event-notices.ts'
import type { AppDispatch } from '#renderer/store/index.ts'
import { notifications_slice, notified } from '#renderer/store/notifications.ts'

const library = (overrides: Partial<Library>): Library => ({
  id: 'id',
  address: '/record/zlinked/record',
  library_type: 'recordstore',
  name: 'Linked',
  track_count: 0,
  linked_library_count: 0,
  audio_size_bytes: 0,
  length: 0,
  heads: [],
  replication_status: { progress: 0, total: 0 },
  is_replicating: false,
  connected: true,
  is_loading_index: false,
  is_processing_index: false,
  is_linked: true,
  is_own: false,
  is_retired: false,
  held_capability_ids: [],
  peer_ids: [],
  ...overrides
})

describe('action toasts', () => {
  test('a linked library updating raises a refresh toast whose action refetches tracks and tags', () => {
    const notice = notice_for_event({ message: { type: 'library:index-updated', payload: { library_address: '/record/zlinked/record' } }, libraries: [library({})] })
    expect(notice).toMatchObject({ title: 'Library updated', action: { label: 'refresh' } })
    const dispatched: unknown[] = []
    const routes: string[] = []
    run_toast_action({ action: notice?.action ?? { label: '' }, dispatch: ((action: unknown) => { dispatched.push(action) }) as AppDispatch, navigate: (route) => { routes.push(route) } })
    expect(dispatched).toEqual([node_api.util.invalidateTags(['tracks', 'tags', 'libraries'])])
    expect(routes).toEqual([])
  })

  test('an own library updating raises nothing; an import finishing offers the tracks', () => {
    expect(notice_for_event({ message: { type: 'library:index-updated', payload: { library_address: '/record/zown/record' } }, libraries: [library({ address: '/record/zown/record', is_own: true })] })).toBeNull()
    expect(notice_for_event({ message: { type: 'import:finished', payload: { track_count: 3, error_count: 0 } }, libraries: [] }))
      .toMatchObject({ title: 'Import finished', message: '3 tracks added.', action: { label: 'go to tracks', route: '/tracks' } })
  })

  test('a toast with the same key replaces the one showing', () => {
    let state = notifications_slice.reducer(undefined, notified({ kind: 'info', message: 'one', key: 'k' }))
    state = notifications_slice.reducer(state, notified({ kind: 'info', message: 'two', key: 'k' }))
    expect(state.items.map(({ message }) => message)).toEqual(['two'])
  })
})
