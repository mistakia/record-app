// Listen history (GET /listens): tracks by most recent listen.

import { useState } from 'react'

import styles from './listens.module.css'
import { TRACK_PAGE_SIZE } from '#renderer/api/types.ts'
import { format_seconds } from '#renderer/components/common/format-seconds.ts'
import { own_library_address } from '#renderer/components/library/library-category.ts'
import { play_tracks } from '#renderer/player/player-controller.ts'
import { node_api } from '#renderer/store/api.ts'

const format_time = (ms: number | undefined): string => ms === undefined ? '' : new Date(ms).toLocaleString()

export const Listens = () => {
  const [page, set_page] = useState(0)
  const listens = node_api.endpoints.get_listens.useQuery({ offset: page * TRACK_PAGE_SIZE, limit: TRACK_PAGE_SIZE })
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const items = listens.data?.items ?? []
  const page_count = Math.max(1, Math.ceil((listens.data?.total ?? 0) / TRACK_PAGE_SIZE))

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <h1>Listens</h1>
        <button type='button' aria-label='Previous page' disabled={page === 0} onClick={() => { set_page(page - 1) }}>Previous</button>
        <span>Page {page + 1} of {page_count}</span>
        <button type='button' aria-label='Next page' disabled={page + 1 >= page_count} onClick={() => { set_page(page + 1) }}>Next</button>
      </div>
      {listens.error !== undefined && <p className={styles.error}>{'message' in listens.error ? listens.error.message : 'The node request failed.'}</p>}
      {listens.isSuccess && items.length === 0 && <p className={styles.muted}>No listens yet.</p>}
      <table className={styles.table}>
        <thead><tr><th>Title</th><th>Artist</th><th>Listens</th><th>Last listened</th><th>Duration</th></tr></thead>
        <tbody>
          {items.map((track, index) => (
            <tr key={track.id} data-testid='listen-row'>
              <td>
                <button
                  type='button'
                  className={styles.title}
                  onClick={() => { play_tracks({ tracks: items, start_index: index, library_address: own_library_address(libraries.data) ?? '' }) }}
                >
                  {track.title ?? 'Untitled'}
                </button>
              </td>
              <td>{track.artist ?? ''}</td>
              <td>{track.listen_count}</td>
              <td>{format_time(track.listen_timestamps_ms?.at(-1))}</td>
              <td>{track.duration_seconds == null ? '' : format_seconds(track.duration_seconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
