// What a track list shows: a view of GET /tracks, or the listen history
// (GET /listens). Both page by 200 rows, so one virtual list renders either.

import { TRACK_PAGE_SIZE, type TrackList } from '#renderer/api/types.ts'
import { node_api, track_page_args, type TrackFilters } from '#renderer/store/api.ts'
import type { RootState } from '#renderer/store/index.ts'

export type ListSource =
  | { kind: 'tracks', library_address: string, filters: TrackFilters }
  | { kind: 'listens' }

export const listens_args = (page: number) => ({ offset: page * TRACK_PAGE_SIZE, limit: TRACK_PAGE_SIZE })

export const select_list_page = (state: RootState, source: ListSource, page: number): TrackList | undefined =>
  source.kind === 'tracks'
    ? node_api.endpoints.get_tracks.select(track_page_args({ library_address: source.library_address, page, filters: source.filters }))(state).data
    : node_api.endpoints.get_listens.select(listens_args(page))(state).data

// Holds one page's subscription while it is near the viewport.
export const PageSubscription = ({ source, page }: { source: ListSource, page: number }) => {
  node_api.endpoints.get_tracks.useQuery(
    source.kind === 'tracks' ? track_page_args({ library_address: source.library_address, page, filters: source.filters }) : { offset: 0, limit: 0 },
    { skip: source.kind !== 'tracks' }
  )
  node_api.endpoints.get_listens.useQuery(listens_args(page), { skip: source.kind !== 'listens' })
  return null
}
