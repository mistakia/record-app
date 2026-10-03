import { describe, expect, test } from 'bun:test'

import type { Library, Track } from '#renderer/api/types.ts'
import { build_snapshot, restore_snapshot } from '#renderer/snapshot/hibernation.ts'
import { node_api, track_page_args } from '#renderer/store/api.ts'
import { connection_loaded } from '#renderer/store/connection.ts'
import { store } from '#renderer/store/index.ts'
import { EMPTY_QUEUE, type QueueEntry } from '#renderer/player/queue-manager.ts'
import { player_restored } from '#renderer/store/player.ts'
import { library_selected } from '#renderer/store/ui.ts'

const NODE_URL = 'http://127.0.0.1:3000'
const ADDRESS = '/record/zabc/record'

const library = { id: 'l', address: ADDRESS, name: 'Own', track_count: 1, is_own: true } as unknown as Library
const track: Track = {
  id: 'a'.repeat(64),
  content_cid: 'content',
  audio_cid: 'audio',
  audio_size_bytes: 10,
  title: 'Intro',
  artist: 'SebastiAn',
  album: 'Remixes',
  duration_seconds: 51,
  genre: ['electronic'],
  resolvers: [],
  tags: [{ library_address: ADDRESS, tag: 'favorite' }],
  listen_count: 2,
  have_track: true
}

const entry: QueueEntry = {
  queue_id: 'q1',
  track_id: track.id,
  audio_cid: 'audio',
  title: 'Intro',
  artist: 'SebastiAn',
  duration_seconds: 51,
  library_address: ADDRESS
}
const other: QueueEntry = { ...entry, queue_id: 'q2', track_id: 'b'.repeat(64), title: 'Other', duration_seconds: 20 }

describe('hibernation snapshot', () => {
  test('is null before the library list has loaded', () => {
    store.dispatch(node_api.util.resetApiState())
    store.dispatch(connection_loaded({ mode: 'remote', node_url: NODE_URL, node_key: NODE_URL }))
    expect(build_snapshot({ state: store.getState(), route: '/tracks' })).toBeNull()
  })

  test('captures the libraries, the active first page, and the queue, and restores them into the cache', async () => {
    store.dispatch(connection_loaded({ mode: 'remote', node_url: NODE_URL, node_key: NODE_URL }))
    store.dispatch(library_selected(ADDRESS))
    await store.dispatch(node_api.util.upsertQueryData('get_libraries', undefined, [library]))
    await store.dispatch(node_api.util.upsertQueryData('get_tracks', track_page_args({ library_address: ADDRESS, page: 0 }), { items: [track], total: 1 }))
    // A later page is never captured.
    await store.dispatch(node_api.util.upsertQueryData('get_tracks', track_page_args({ library_address: ADDRESS, page: 1 }), { items: [track], total: 1 }))
    store.dispatch(player_restored({ queue: { ...EMPTY_QUEUE, entries: [entry, other], index: 1, repeat: 'all' }, position_seconds: 17 }))

    const snapshot = build_snapshot({ state: store.getState(), route: '/tracks' })
    if (snapshot === null) throw new Error('no snapshot')
    expect(snapshot.active?.tracks).toHaveLength(1)
    expect(snapshot.active?.tracks[0]).not.toHaveProperty('genre')
    expect(snapshot.queue).toEqual({ entries: [entry, other], index: 1, position_seconds: 17, repeat: 'all', shuffle: false })

    store.dispatch(node_api.util.resetApiState())
    store.dispatch(library_selected(''))
    store.dispatch(player_restored({ queue: EMPTY_QUEUE, position_seconds: 0 }))
    await restore_snapshot({ dispatch: store.dispatch, snapshot: { ...snapshot, written_at_ms: 1 } })
    const state = store.getState()
    expect(state.ui.library_address).toBe(ADDRESS)
    expect(node_api.endpoints.get_libraries.select()(state).data).toEqual([library])
    const page = node_api.endpoints.get_tracks.select(track_page_args({ library_address: ADDRESS, page: 0 }))(state).data
    expect(page?.total).toBe(1)
    expect(page?.items[0]).toMatchObject({ id: track.id, title: 'Intro', audio_cid: 'audio', tags: track.tags })
    expect(state.player.queue).toMatchObject({ entries: [entry, other], index: 1, repeat: 'all', shuffle: false, unshuffled: null })
    expect(state.player).toMatchObject({ position_seconds: 17, duration_seconds: 20 })
  })

  test('keeps the last captured first page while it has left the cache, for the same library only', async () => {
    store.dispatch(node_api.util.resetApiState())
    await store.dispatch(node_api.util.upsertQueryData('get_libraries', undefined, [library]))
    store.dispatch(library_selected(ADDRESS))
    const previous_active = { library_address: ADDRESS, total: 1, tracks: [] }
    expect(build_snapshot({ state: store.getState(), route: '/tracks', previous_active })?.active).toBe(previous_active)
    store.dispatch(library_selected(''))
    expect(build_snapshot({ state: store.getState(), route: '/tracks', previous_active })?.active).toBeNull()
  })
})
