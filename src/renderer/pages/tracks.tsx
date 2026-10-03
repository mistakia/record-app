// Browsing (spec §8.9.1): aggregated and per-library views, debounced
// full-text search, sort, and a tag filter, all answered by the node
// (§8.8.2), over a virtualized list of the whole result.

import { useEffect, useState } from 'react'

import styles from './tracks.module.css'
import type { Track } from '#renderer/api/types.ts'
import type { MenuItem } from '#renderer/components/common/context-menu.tsx'
import { library_category, library_name, own_library_address } from '#renderer/components/library/library-category.ts'
import { TagEditor } from '#renderer/components/track/tag-editor.tsx'
import { TagFilter } from '#renderer/components/track/tag-filter.tsx'
import { TrackList } from '#renderer/components/track/track-list.tsx'
import { SEARCH_INPUT_ID } from '#renderer/hooks/use-hotkeys.ts'
import { add_to_queue, play_tracks } from '#renderer/player/player-controller.ts'
import { node_api, track_page_args, type SortOrder, type TrackSort } from '#renderer/store/api.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { filters_cleared, library_selected, query_changed, sort_changed } from '#renderer/store/ui.ts'

const SEARCH_DEBOUNCE_MS = 250
const SORTS: Array<{ value: TrackSort, label: string }> = [
  { value: 'added_at', label: 'Date added' },
  { value: 'title', label: 'Title' },
  { value: 'artist', label: 'Artist' },
  { value: 'album', label: 'Album' },
  { value: 'duration', label: 'Duration' },
  { value: 'bpm', label: 'BPM' }
]

export const Tracks = () => {
  const dispatch = use_app_dispatch()
  const library_address = use_app_selector((state) => state.ui.library_address)
  const filters = use_app_selector((state) => state.ui.filters)
  const [search, set_search] = useState(filters.query)
  const [tagging, set_tagging] = useState<Track | null>(null)
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const first_page = node_api.endpoints.get_tracks.useQuery(track_page_args({ library_address, page: 0, filters }))
  const own_address = own_library_address(libraries.data)
  // A listen records the library a track was played from: the selected one,
  // or in the aggregated view the own library.
  const listen_library = library_address !== '' ? library_address : own_address ?? ''

  useEffect(() => {
    if (search === filters.query) return
    const timer = setTimeout(() => { dispatch(query_changed(search)) }, SEARCH_DEBOUNCE_MS)
    return () => { clearTimeout(timer) }
  }, [search, filters.query, dispatch])

  const total = first_page.data?.total ?? 0
  const error = first_page.error ?? libraries.error
  const filtered = filters.query.trim() !== '' || filters.tags.length > 0

  const menu_items = (track: Track): MenuItem[] => [
    { label: 'Play', on_select: () => { play_tracks({ tracks: [track], start_index: 0, library_address: listen_library }) } },
    { label: 'Play next', on_select: () => { add_to_queue({ tracks: [track], at: 'next', library_address: listen_library }) } },
    { label: 'Add to queue', on_select: () => { add_to_queue({ tracks: [track], at: 'end', library_address: listen_library }) } },
    { label: track.have_track ? 'Edit tags' : 'Show tags', on_select: () => { set_tagging(track) } }
  ]

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <select aria-label='Library' value={library_address} onChange={(event) => { dispatch(library_selected(event.target.value)) }}>
          <option value=''>All libraries</option>
          {libraries.data?.map((library) => (
            <option key={library.id} value={library.address}>
              {library_name(library)} ({library_category(library)}{library.is_retired ? ', retired' : ''}, {library.track_count} tracks)
            </option>
          ))}
        </select>
        <input
          id={SEARCH_INPUT_ID}
          type='search'
          aria-label='Search tracks'
          placeholder='Search title, artist, album'
          value={search}
          onChange={(event) => { set_search(event.target.value) }}
        />
        <select
          aria-label='Sort by'
          value={filters.sort}
          onChange={(event) => { dispatch(sort_changed({ sort: event.target.value as TrackSort, order: filters.order })) }}
        >
          {SORTS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button
          type='button'
          aria-label={filters.order === 'asc' ? 'Ascending' : 'Descending'}
          onClick={() => { dispatch(sort_changed({ sort: filters.sort, order: (filters.order === 'asc' ? 'desc' : 'asc') as SortOrder })) }}
        >
          {filters.order === 'asc' ? 'Asc' : 'Desc'}
        </button>
        <span className={styles.count} data-testid='track-total'>{total} tracks</span>
        {filtered && (
          <button type='button' onClick={() => { set_search(''); dispatch(filters_cleared()) }}>Clear filters</button>
        )}
      </div>
      <TagFilter library_address={library_address} />
      {error !== undefined && <p className={styles.error}>{'message' in error ? error.message : 'The node request failed.'}</p>}
      {first_page.isSuccess && total === 0 && <p className={styles.muted}>{filtered ? 'No tracks match.' : 'No tracks in this view yet.'}</p>}
      <TrackList
        library_address={library_address}
        filters={filters}
        total={total}
        busy={first_page.isFetching}
        on_play={({ page_tracks, index }) => { play_tracks({ tracks: page_tracks, start_index: index, library_address: listen_library }) }}
        on_queue={({ track, at }) => { add_to_queue({ tracks: [track], at, library_address: listen_library }) }}
        menu_items={menu_items}
      />
      {tagging !== null && <TagEditor track={tagging} own_address={own_address} on_close={() => { set_tagging(null) }} />}
    </section>
  )
}
