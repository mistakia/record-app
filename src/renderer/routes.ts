// The app's routes. A track list's whole view — library, search, tags, and
// sort — lives in the route's query, so back and forward restore it and a
// "playing from" link can return to it.

import { DEFAULT_TRACK_FILTERS, type SortOrder, type TrackFilters, type TrackSort } from '#renderer/store/api.ts'

export const ROUTES = {
  tracks: '/tracks',
  listens: '/listens',
  libraries: '/libraries',
  link_library: '/libraries/link',
  new_library: '/libraries/new',
  library_profile: '/library/profile',
  library_writers: '/library/writers',
  issue_capability: '/library/writers/issue',
  import: '/import',
  identity: '/identity',
  settings: '/settings'
} as const

export type SettingsSection = 'connection' | 'storage' | 'shortcuts' | 'peers' | 'diagnostics'

export const TRACK_SORTS: readonly TrackSort[] = ['added_at', 'title', 'artist', 'album', 'duration', 'bpm', 'bitrate', 'listen_count']

export interface TrackView {
  // '' is every library, aggregated.
  library_address: string
  filters: TrackFilters
}

export const tracks_route = ({ library_address = '', filters = DEFAULT_TRACK_FILTERS }: Partial<TrackView> = {}): string => {
  const query = new URLSearchParams()
  if (library_address !== '') query.set('library', library_address)
  if (filters.query.trim() !== '') query.set('q', filters.query)
  for (const tag of filters.tags) query.append('tag', tag)
  if (filters.sort !== DEFAULT_TRACK_FILTERS.sort) query.set('sort', filters.sort)
  if (filters.order !== DEFAULT_TRACK_FILTERS.order) query.set('order', filters.order)
  const text = query.toString()
  return text === '' ? ROUTES.tracks : `${ROUTES.tracks}?${text}`
}

export const parse_track_view = (search: URLSearchParams): TrackView => {
  const sort = search.get('sort')
  const order = search.get('order')
  return {
    library_address: search.get('library') ?? '',
    filters: {
      query: search.get('q') ?? '',
      tags: [...new Set(search.getAll('tag').filter((tag) => tag !== ''))],
      sort: TRACK_SORTS.includes(sort as TrackSort) ? sort as TrackSort : DEFAULT_TRACK_FILTERS.sort,
      order: order === 'asc' || order === 'desc' ? order as SortOrder : DEFAULT_TRACK_FILTERS.order
    }
  }
}

// An own library's management tabs, beside its track list.
export type LibraryTab = 'tracks' | 'profile' | 'writers'

export const library_route = ({ tab, library_address }: { tab: LibraryTab, library_address: string }): string =>
  tab === 'tracks'
    ? tracks_route({ library_address })
    : `${tab === 'profile' ? ROUTES.library_profile : ROUTES.library_writers}?${new URLSearchParams({ library: library_address }).toString()}`

// The step flow that lets another identity write to an own library.
export const issue_route = (library_address: string): string =>
  `${ROUTES.issue_capability}?${new URLSearchParams({ library: library_address }).toString()}`

export const settings_route = (section?: SettingsSection): string =>
  section === undefined ? ROUTES.settings : `${ROUTES.settings}?section=${section}`

// The path alone, for matching a route that carries a query.
export const route_path = (route: string): string => route.split('?')[0] ?? route

// A tag chip toggles the tag in the filter (all must match).
export const with_tag_toggled = (view: TrackView, tag: string): TrackView => ({
  ...view,
  filters: { ...view.filters, tags: view.filters.tags.includes(tag) ? view.filters.tags.filter((item) => item !== tag) : [...view.filters.tags, tag] }
})

// Clearing keeps the sort, which is a way of reading, not a filter.
export const with_filters_cleared = (view: TrackView): TrackView => ({
  ...view,
  filters: { ...DEFAULT_TRACK_FILTERS, sort: view.filters.sort, order: view.filters.order }
})

// A header click sorts by the column, and a second click on the active
// column reverses it.
export const with_sort = (view: TrackView, sort: TrackSort): TrackView => ({
  ...view,
  filters: {
    ...view.filters,
    sort,
    order: view.filters.sort === sort ? (view.filters.order === 'asc' ? 'desc' : 'asc') : ['added_at', 'duration', 'bitrate', 'listen_count'].includes(sort) ? 'desc' : 'asc'
  }
})
