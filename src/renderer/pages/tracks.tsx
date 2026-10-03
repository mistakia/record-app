// The track list: a library selector over GET /libraries and a paginated
// GET /tracks. Every value from the node is rendered as plain text (spec
// §8.10.6); React escapes it and nothing here sets HTML.

import { useState } from 'react'

import styles from './tracks.module.css'
import { TRACK_PAGE_SIZE, type Library } from '#renderer/api/types.ts'
import { TrackRow } from '#renderer/components/track/track-row.tsx'
import { node_api, track_page_args } from '#renderer/store/api.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { library_selected } from '#renderer/store/ui.ts'

const library_label = (library: Library): string => {
  const name = library.alias ?? library.name ?? library.address
  const category = library.is_own ? 'own' : library.is_linked ? 'linked' : 'known'
  return `${name} (${category}, ${library.track_count} tracks)`
}

export const Tracks = () => {
  const dispatch = use_app_dispatch()
  const library_address = use_app_selector((state) => state.ui.library_address)
  const [page, set_page] = useState(0)
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const tracks = node_api.endpoints.get_tracks.useQuery(track_page_args({ library_address, page }))

  const total = tracks.data?.total ?? 0
  const page_count = Math.max(1, Math.ceil(total / TRACK_PAGE_SIZE))
  const error = tracks.error ?? libraries.error

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <select
          aria-label='Library'
          value={library_address}
          onChange={(event) => {
            dispatch(library_selected(event.target.value))
            set_page(0)
          }}
        >
          <option value=''>All libraries</option>
          {libraries.data?.map((library) => (
            <option key={library.id} value={library.address}>{library_label(library)}</option>
          ))}
        </select>
        <span className={styles.count} data-testid='track-total'>{total} tracks</span>
        <button type='button' disabled={page === 0} onClick={() => { set_page(page - 1) }}>Previous</button>
        <span>Page {page + 1} of {page_count}</span>
        <button type='button' disabled={page + 1 >= page_count} onClick={() => { set_page(page + 1) }}>Next</button>
      </div>
      {error !== undefined && <p className={styles.error}>{'message' in error ? error.message : 'The node request failed.'}</p>}
      {tracks.isLoading && <p className={styles.muted}>Loading tracks</p>}
      <table className={styles.table} aria-busy={tracks.isFetching}>
        <thead>
          <tr><th>Title</th><th>Artist</th><th>Album</th><th>Duration</th></tr>
        </thead>
        <tbody>
          {tracks.data?.items.map((track) => <TrackRow key={track.id} track={track} />)}
        </tbody>
      </table>
    </section>
  )
}
