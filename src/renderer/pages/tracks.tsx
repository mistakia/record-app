// Browsing (spec §8.9.1, STYLE.md § Components › Track list): every library
// aggregated, or one, with debounced full-text search, sort, and the tag
// filter, all answered by the node (§8.8.2) over a virtualized list of the
// whole result. The view lives in the route (routes.ts), so back and
// forward restore it.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import styles from './tracks.module.css'
import { EmptyState } from '#renderer/components/common/empty-state.tsx'
import { Skeleton } from '#renderer/components/common/skeleton.tsx'
import { library_name, own_library_address } from '#renderer/components/library/library-category.ts'
import { list_commands } from '#renderer/components/track/list-commands.ts'
import { Inspector } from '#renderer/components/track/inspector.tsx'
import { use_inspector_fit } from '#renderer/components/track/use-inspector-fit.ts'
import { TagFilter } from '#renderer/components/track/tag-filter.tsx'
import { TrackList } from '#renderer/components/track/track-list.tsx'
import { use_tag_navigation, use_track_actions } from '#renderer/components/track/use-track-actions.tsx'
import { SEARCH_INPUT_ID } from '#renderer/hooks/use-hotkeys.ts'
import { play_tracks, toggle_shuffle_mode } from '#renderer/player/player-controller.ts'
import { parse_track_view, ROUTES, tracks_route, with_filters_cleared, with_sort, with_tag_toggled, type TrackView } from '#renderer/routes.ts'
import { node_api, track_page_args } from '#renderer/store/api.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { view_changed } from '#renderer/store/ui.ts'

const SEARCH_DEBOUNCE_MS = 250

export const Tracks = () => {
  const dispatch = use_app_dispatch()
  const navigate = useNavigate()
  const { search: route_search } = useLocation()
  const view = useMemo(() => parse_track_view(new URLSearchParams(route_search)), [route_search])
  const { library_address, filters } = view
  const [search, set_search] = useState(filters.query)
  const [inspecting, set_inspecting] = useState(false)
  const search_ref = useRef<HTMLInputElement>(null)
  const body_ref = useRef<HTMLDivElement>(null)
  use_inspector_fit({ body: body_ref, open: inspecting, close: () => { set_inspecting(false) } })
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const first_page = node_api.endpoints.get_tracks.useQuery(track_page_args({ library_address, page: 0, filters }))
  const shuffle = use_app_selector((state) => state.player.queue.shuffle)
  const own_address = own_library_address(libraries.data)
  // A listen records the library a track was played from: the shown one,
  // or in the aggregated view the own library.
  const listen_library = library_address !== '' ? library_address : own_address ?? ''
  const viewed = libraries.data?.find(({ address }) => address === library_address)
  const go = (next: TrackView, replace = false) => { navigate(tracks_route(next), { replace }) }

  useEffect(() => { dispatch(view_changed(view)) }, [dispatch, view])
  // Back and forward bring their own search text.
  useEffect(() => { set_search(filters.query) }, [filters.query])
  useEffect(() => {
    if (search === filters.query) return
    const timer = setTimeout(() => { go({ ...view, filters: { ...filters, query: search } }, true) }, SEARCH_DEBOUNCE_MS)
    return () => { clearTimeout(timer) }
  })

  const total = first_page.data?.total ?? 0
  const error = first_page.error ?? libraries.error
  const filtered = filters.query.trim() !== '' || filters.tags.length > 0
  const open_tag = use_tag_navigation()

  const { actions, dialogs } = use_track_actions({
    viewed_library: library_address,
    listen_library,
    source: {
      route: tracks_route(view),
      label: library_address === '' ? 'All tracks' : viewed === undefined ? library_address : library_name(viewed),
      subtitle: filters.tags.length === 0 ? null : filters.tags.join(' + '),
      library_address
    },
    // A chip filters this view by its tag, or opens the library it came from.
    on_tag_clicked: ({ tag, library_address: tag_library }) => {
      if (library_address === '' || tag_library === library_address) go(with_tag_toggled(view, tag))
      else open_tag({ tag, library_address: tag_library })
    },
    toggle_inspector: () => { set_inspecting((open) => !open) },
    clear_search: () => {
      if (search === '' && filters.query === '') return false
      set_search('')
      go({ ...view, filters: { ...filters, query: '' } }, true)
      return true
    },
    close_pane: () => {
      if (!inspecting) return false
      set_inspecting(false)
      return true
    }
  })

  const shuffle_play = () => {
    toggle_shuffle_mode()
    const items = first_page.data?.items ?? []
    if (!shuffle && items.length > 0) play_tracks({ tracks: items, start_index: Math.floor(Math.random() * items.length), library_address: listen_library })
  }

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <input
            ref={search_ref}
            id={SEARCH_INPUT_ID}
            type='search'
            aria-label='Search tracks'
            placeholder='/ search'
            spellCheck={false}
            value={search}
            onChange={(event) => { set_search(event.target.value) }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'ArrowDown') {
                event.preventDefault()
                list_commands()?.focus()
              }
            }}
          />
          {search !== '' && (
            <button type='button' data-variant='glyph' aria-label='Clear search' onClick={() => { set_search(''); search_ref.current?.focus() }}>×</button>
          )}
        </div>
        <span className={styles.count} data-testid='track-total'>{total} tracks</span>
        {filtered && (
          <button type='button' data-variant='ghost' data-size='small' onClick={() => { set_search(''); go(with_filters_cleared(view)) }}>Clear filters</button>
        )}
        {own_address !== null && <Link to={ROUTES.import} className={styles.add} aria-label='Import tracks'>[+]</Link>}
        <button type='button' data-variant='glyph' className={styles.shuffle} aria-pressed={shuffle} onClick={shuffle_play}>Shuffle</button>
      </div>
      <TagFilter library_address={library_address} selected={filters.tags} on_toggle={(tag) => { go(with_tag_toggled(view, tag)) }} />
      {error !== undefined && <p className={styles.error}>!! {'message' in error ? error.message : 'The node request failed.'}</p>}
      {first_page.isLoading && first_page.data === undefined
        ? <Skeleton />
        : first_page.isSuccess && total === 0
          ? filtered
            ? <EmptyState headline='No match' detail='No track in this view matches the search and tags.' action={<button type='button' onClick={() => { set_search(''); go(with_filters_cleared(view)) }}>Clear filters</button>} />
            : <EmptyState headline='Empty' detail='No tracks in this view yet. Import some, or link a library.' action={<Link to={ROUTES.import}>Import</Link>} />
          : (
            <div ref={body_ref} className={styles.body}>
              <TrackList
                source={{ kind: 'tracks', library_address, filters }}
                view_key={tracks_route(view)}
                total={total}
                busy={first_page.isFetching}
                sort={{ sort: filters.sort, order: filters.order, on_sort: (sort) => { go(with_sort(view, sort)) } }}
                actions={actions}
              />
              {inspecting && <Inspector source={{ kind: 'tracks', library_address, filters }} on_close={() => { set_inspecting(false) }} />}
            </div>
            )}
      {dialogs}
    </section>
  )
}
