// A track as the node last described it, from the cached track pages of one
// library view (scope, '' for every library). The node describes a track per
// view, its tags above all, so a page of another view never stands in. The
// newest page wins: a page of a view no longer shown keeps what it had when
// it was fetched, and a page refetching keeps its last answer.

import type { Track, TrackList } from '#renderer/api/types.ts'
import type { GetTracksArgs, node_api } from './api.ts'

type ApiQueries = ReturnType<typeof node_api.reducer>['queries']

const in_scope = (args: GetTracksArgs, scope: string): boolean => {
  const addresses = args.library_addresses ?? []
  return scope === '' ? addresses.length === 0 : addresses.length === 1 && addresses[0] === scope
}

export const freshest_cached_track = ({ queries, track_id, scope }: { queries: ApiQueries, track_id: string, scope: string }): Track | null => {
  const pages = Object.values(queries)
    .filter((query) => query?.endpointName === 'get_tracks' && query.data !== undefined && in_scope(query.originalArgs as GetTracksArgs, scope))
    .sort((a, b) => (b?.fulfilledTimeStamp ?? 0) - (a?.fulfilledTimeStamp ?? 0))
  for (const page of pages) {
    const track = (page?.data as TrackList).items.find(({ id }) => id === track_id)
    if (track !== undefined) return track
  }
  return null
}
