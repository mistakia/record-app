// A track as the node last described it, from the cached track pages of one
// library view (scope, '' for every library). The node describes a track per
// view, its tags above all, so a page of another view never stands in. The
// newest page wins: a page of a view no longer shown keeps what it had when
// it was fetched, and a page refetching keeps its last answer.

import type { Track, TrackList } from '#renderer/api/types.ts'
import type { GetTracksArgs, node_api } from './api.ts'

type ApiQueries = ReturnType<typeof node_api.reducer>['queries']

// The view a page belongs to, or null for a page of several libraries,
// which describes a track for no single view.
const page_scope = (args: GetTracksArgs): string | null => {
  const addresses = args.library_addresses ?? []
  if (addresses.length === 0) return ''
  return addresses.length === 1 ? addresses[0] ?? null : null
}

const key = (scope: string, track_id: string): string => `${scope}\n${track_id}`

// One index per cache state, so a whole queue looks its tracks up in one pass
// over the cached pages rather than one pass per entry.
const indexes = new WeakMap<ApiQueries, Map<string, Track>>()

const index_of = (queries: ApiQueries): Map<string, Track> => {
  const known = indexes.get(queries)
  if (known !== undefined) return known
  const index = new Map<string, Track>()
  const pages = Object.values(queries)
    .flatMap((query) => query?.endpointName === 'get_tracks' && query.data !== undefined
      ? [{ scope: page_scope(query.originalArgs as GetTracksArgs), items: (query.data as TrackList).items, at: query.fulfilledTimeStamp ?? 0 }]
      : [])
    .sort((a, b) => b.at - a.at)
  for (const { scope, items } of pages) {
    if (scope === null) continue
    for (const track of items) {
      const track_key = key(scope, track.id)
      if (!index.has(track_key)) index.set(track_key, track)
    }
  }
  indexes.set(queries, index)
  return index
}

export const freshest_cached_track = ({ queries, track_id, scope }: { queries: ApiQueries, track_id: string, scope: string }): Track | null =>
  index_of(queries).get(key(scope, track_id)) ?? null
