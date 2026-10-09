import { describe, expect, test } from 'bun:test'

import { is_cid } from '#renderer/components/library/cid.ts'
import { current_progress, is_replicating, library_category, own_library_address, RECENT_LINK_MS } from '#renderer/components/library/library-category.ts'
import { pages_for_rows, row_location } from '#renderer/components/track/track-pages.ts'
import type { Library } from '#renderer/api/types.ts'
import { DEFAULT_TRACK_FILTERS, track_page_args } from '#renderer/store/api.ts'
import { import_event_received, import_requested, imports_slice } from '#renderer/store/imports.ts'
import { library_event_received, library_linked, live_progress_cleared, replication_slice } from '#renderer/store/replication.ts'
import { library_selected, ui_slice, view_changed } from '#renderer/store/ui.ts'
import { parse_track_view, tracks_route, with_filters_cleared, with_sort, with_tag_toggled } from '#renderer/routes.ts'

const library = (overrides: Partial<Library> = {}): Library => ({
  id: 'id',
  address: '/record/zabc/record',
  library_type: 'recordstore',
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
  is_linked: false,
  is_own: false,
  is_retired: false,
  held_capability_ids: [],
  peer_ids: [],
  ...overrides
})

describe('virtual list pages', () => {
  test('subscribes the pages under the visible rows plus one either side, always including the first', () => {
    expect(pages_for_rows({ first_row: 0, last_row: 30, total: 19_000 })).toEqual([0, 1])
    expect(pages_for_rows({ first_row: 4_000, last_row: 4_030, total: 19_000 })).toEqual([0, 19, 20, 21])
    expect(pages_for_rows({ first_row: 18_990, last_row: 18_999, total: 19_000 })).toEqual([0, 93, 94])
    expect(pages_for_rows({ first_row: 0, last_row: 0, total: 0 })).toEqual([0])
    expect(row_location(4_321)).toEqual({ page: 21, offset: 121 })
  })

  test('query args leave defaults out, so equal views share one cache entry, and sort tags', () => {
    expect(track_page_args({ library_address: '', page: 0 })).toEqual({ offset: 0, limit: 200 })
    expect(track_page_args({ library_address: '/a', page: 2, filters: { query: ' intro ', tags: ['b', 'a'], sort: 'title', order: 'asc' } }))
      .toEqual({ offset: 400, limit: 200, library_addresses: ['/a'], query: 'intro', tags: ['a', 'b'], sort: 'title', order: 'asc' })
  })
})

describe('track view route', () => {
  test('round-trips library, search, tags, and sort through the query, leaving defaults out', () => {
    const view = { library_address: '/record/a/b', filters: { query: 'intro ä', tags: ['house', 'deep house'], sort: 'title' as const, order: 'asc' as const } }
    const route = tracks_route(view)
    expect(route.startsWith('/tracks?')).toBe(true)
    expect(parse_track_view(new URLSearchParams(route.split('?')[1]))).toEqual(view)
    expect(tracks_route()).toBe('/tracks')
    expect(parse_track_view(new URLSearchParams(''))).toEqual({ library_address: '', filters: DEFAULT_TRACK_FILTERS })
  })

  test('refuses an unknown sort or order and drops duplicate tags', () => {
    expect(parse_track_view(new URLSearchParams('sort=drop%20table&order=up&tag=a&tag=a')).filters).toEqual({ ...DEFAULT_TRACK_FILTERS, tags: ['a'] })
  })

  test('toggles tags, clears filters but keeps sort, and reverses an active sort', () => {
    let view = parse_track_view(new URLSearchParams('q=intro'))
    view = with_tag_toggled(with_tag_toggled(with_tag_toggled(view, 'house'), 'techno'), 'house')
    expect(view.filters.tags).toEqual(['techno'])
    view = with_sort(view, 'title')
    expect(view.filters).toMatchObject({ sort: 'title', order: 'asc' })
    expect(with_sort(view, 'title').filters.order).toBe('desc')
    expect(with_filters_cleared(view).filters).toEqual({ ...DEFAULT_TRACK_FILTERS, sort: 'title', order: 'asc' })
  })
})

describe('ui slice', () => {
  test('mirrors the route view, and drops tags on a library change', () => {
    let state = ui_slice.reducer(undefined, view_changed({ library_address: '', filters: { ...DEFAULT_TRACK_FILTERS, tags: ['house'] } }))
    expect(state.filters.tags).toEqual(['house'])
    state = ui_slice.reducer(state, library_selected('/other'))
    expect(state).toMatchObject({ library_address: '/other', filters: { tags: [] } })
  })
})

describe('libraries', () => {
  test('category, own address, and replicating, including a fresh link with nothing yet', () => {
    expect(library_category(library({ is_own: true }))).toBe('own')
    expect(library_category(library({ is_linked: true }))).toBe('linked')
    expect(library_category(library({ is_linked: true, held_capability_ids: ['cap'] }))).toBe('shared')
    expect(library_category(library({ is_own: true, held_capability_ids: ['cap'] }))).toBe('own')
    expect(library_category(library())).toBe('discovered')
    expect(own_library_address([library(), library({ is_own: true, address: '/mine' })])).toBe('/mine')
    // The listens library and a retired one are own too, and never the write target.
    expect(own_library_address([
      library({ is_own: true, library_type: 'listens', address: '/listens' }),
      library({ is_own: true, is_retired: true, address: '/retired' }),
      library({ is_own: true, address: '/mine' })
    ])).toBe('/mine')
    const linked = library({ is_linked: true })
    const none = { progress: 0, total: 0 }
    // A fresh link with nothing from the node counts as replicating for 60 s only.
    expect(is_replicating({ library: linked, progress: none, linked_at: 1_000, now: 1_000 + 59_000 })).toBe(true)
    expect(is_replicating({ library: linked, progress: none, linked_at: 1_000, now: 1_000 + RECENT_LINK_MS })).toBe(false)
    // Once the node reports a status, the fresh-link grace no longer applies.
    expect(is_replicating({ library: library({ is_linked: true, replication_status: { progress: 4, total: 4 }, length: 4 }), progress: { progress: 4, total: 4 }, linked_at: 1_000, now: 2_000 })).toBe(false)
    expect(is_replicating({ library: linked, progress: { progress: 3, total: 10 }, linked_at: undefined, now: 0 })).toBe(true)
    expect(is_replicating({ library: library({ is_own: true, is_replicating: true }), progress: none, linked_at: undefined, now: 0 })).toBe(false)
  })

  test('live progress shows only when it arrived after the node\'s last library list', () => {
    const linked = library({ is_linked: true, replication_status: { progress: 9, total: 9 } })
    const live = { progress: 3, total: 9, received_at: 2_000 }
    expect(current_progress({ library: linked, live_progress: live, libraries_fetched_at: 1_000 })).toBe(live)
    expect(current_progress({ library: linked, live_progress: live, libraries_fetched_at: 3_000 })).toEqual({ progress: 9, total: 9 })
    expect(current_progress({ library: linked, live_progress: undefined, libraries_fetched_at: 3_000 })).toEqual({ progress: 9, total: 9 })
  })

  test('the replication slice follows progress, completion, connection, and unlink events, and clears on reconcile', () => {
    const event = (type: string, payload: Record<string, unknown>, at = 5) => library_event_received({ type, payload: { library_address: '/x', ...payload } }, at)
    let state = replication_slice.reducer(undefined, library_linked('/x', 1))
    state = replication_slice.reducer(state, event('library:replicate-progress', { progress: 2, total: 5 }))
    state = replication_slice.reducer(state, event('library:disconnected', {}))
    expect(state).toEqual({ progress: { '/x': { progress: 2, total: 5, received_at: 5 } }, connected: { '/x': false }, linked_at: { '/x': 1 } })
    state = replication_slice.reducer(state, event('library:replicated', { length: 5 }))
    expect(state.progress).toEqual({})
    state = replication_slice.reducer(state, event('library:replicate-progress', { progress: 1, total: 5 }))
    state = replication_slice.reducer(state, live_progress_cleared())
    expect(state.progress).toEqual({})
    state = replication_slice.reducer(state, event('library:unlinked', {}))
    expect(state).toEqual({ progress: {}, connected: {}, linked_at: {} })
  })

  test('is_cid accepts CIDv0 and v1 in base32 and base58btc, and nothing else', () => {
    expect(is_cid('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(true)
    expect(is_cid('bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku')).toBe(true)
    expect(is_cid('zdj7WgqU6359F3FJmSafNMmvmgTEYCEwBMvUMe8imM7yW4VHc')).toBe(true)
    for (const value of ['', 'Qm123', 'https://example.com/a.png', 'bafy SPACE', '../../etc/passwd']) expect(is_cid(value)).toBe(false)
  })
})

describe('imports slice', () => {
  test('builds an import from its events, whichever arrives first', () => {
    const event = (type: string, payload: Record<string, unknown>) => import_event_received({ type, payload: { import_id: 'i1', ...payload } })
    let state = imports_slice.reducer(undefined, event('import:starting', { source: 'file', file_count: 2 }))
    state = imports_slice.reducer(state, import_requested({ import_id: 'i1', label: 'two files', file_count: 2 }))
    state = imports_slice.reducer(state, event('import:processed-file', { file_path: '/tmp/uploads/abc.flac', track: { title: 'Intro' }, completed: 1, remaining: 1 }))
    state = imports_slice.reducer(state, event('import:error', { file_path: '/tmp/uploads/def.flac', error: { error: { code: 'VALIDATION_ERROR', message: 'not audio' } } }))
    state = imports_slice.reducer(state, event('import:finished', { track_count: 1, error_count: 1 }))
    expect(state.items).toEqual([{ import_id: 'i1', label: 'two files', file_count: 2, completed: 1, added: ['Intro'], errors: ['def.flac: not audio'], finished: true }])
  })
})
