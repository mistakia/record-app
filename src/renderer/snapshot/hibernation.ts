// Builds the hibernation snapshot (spec §8.8.3) from the store, and seeds
// the store from one at launch. The restored data renders at once but is
// stale until the first reconcile, like everything else after a connect.

import type { Library, TrackList } from '#renderer/api/types.ts'
import { node_api, track_page_args } from '#renderer/store/api.ts'
import type { AppDispatch, RootState } from '#renderer/store/index.ts'
import { player_restored } from '#renderer/store/player.ts'
import { library_selected } from '#renderer/store/ui.ts'
import { SNAPSHOT_VERSION, type HibernationSnapshot, type SnapshotTrack } from '#shared/snapshot.ts'

const to_snapshot_track = (track: TrackList['items'][number]): SnapshotTrack => ({
  id: track.id,
  content_cid: track.content_cid,
  audio_cid: track.audio_cid,
  audio_size_bytes: track.audio_size_bytes,
  title: track.title ?? null,
  artist: track.artist ?? null,
  album: track.album ?? null,
  duration_seconds: track.duration_seconds ?? null,
  tags: track.tags,
  listen_count: track.listen_count,
  have_track: track.have_track
})

type SnapshotActive = HibernationSnapshot['active']

// The active library's first page as the snapshot holds it, when the cache
// has it. `page` is the cached object, so callers can skip rebuilding when it
// has not changed.
export const select_active_page = (state: RootState): { page: TrackList | undefined, library_address: string } => {
  const { library_address } = state.ui
  return { page: node_api.endpoints.get_tracks.select(track_page_args({ library_address, page: 0 }))(state).data, library_address }
}

export const to_snapshot_active = ({ page, library_address }: { page: TrackList, library_address: string }): NonNullable<SnapshotActive> =>
  ({ library_address, total: page.total, tracks: page.items.map(to_snapshot_track) })

// Null until there is something worth keeping: the library list. The first
// page of the active library leaves the cache when the user pages on and
// events invalidate it, so the caller passes the last one it captured, which
// stands in while it is for the same library.
export const build_snapshot = ({ state, route, previous_active = null }: {
  state: RootState
  route: string
  previous_active?: SnapshotActive
}): Omit<HibernationSnapshot, 'written_at_ms'> | null => {
  const node_url = state.connection.config?.node_url ?? null
  const libraries = node_api.endpoints.get_libraries.select()(state).data
  if (node_url === null || libraries === undefined) return null
  const { page: first_page, library_address } = select_active_page(state)
  const { track, position_seconds } = state.player
  return {
    version: SNAPSHOT_VERSION,
    node_url,
    route,
    libraries: libraries as unknown as Array<Record<string, unknown>>,
    active: first_page !== undefined
      ? to_snapshot_active({ page: first_page, library_address })
      : previous_active?.library_address === library_address ? previous_active : null,
    queue: track === null ? null : { entries: [track], index: 0, position_seconds }
  }
}

// Resolves once the cache holds the restored data, so the first render of
// the routes finds it rather than issuing queries of its own.
export const restore_snapshot = async ({ dispatch, snapshot }: { dispatch: AppDispatch, snapshot: HibernationSnapshot }): Promise<void> => {
  await dispatch(node_api.util.upsertQueryData('get_libraries', undefined, snapshot.libraries as unknown as Library[]))
  if (snapshot.active !== null) {
    const { library_address, total, tracks } = snapshot.active
    dispatch(library_selected(library_address))
    // The snapshot keeps the spec's track fields only; the rest refill on refetch.
    const items = tracks.map((track) => ({ ...track, artists: [], genre: [], artwork: [], resolvers: [] }))
    await dispatch(node_api.util.upsertQueryData('get_tracks', track_page_args({ library_address, page: 0 }), { items, total }))
  }
  const entry = snapshot.queue?.entries[snapshot.queue.index]
  if (snapshot.queue !== null && entry !== undefined) {
    dispatch(player_restored({ track: entry, position_seconds: snapshot.queue.position_seconds }))
  }
}
