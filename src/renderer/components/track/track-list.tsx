// The virtualized track list (spec §8.11.2): one positioned row per visible
// index of the whole result, with the 200-row pages under the visible rows
// subscribed and every other page released.

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useState } from 'react'
import { shallowEqual } from 'react-redux'

import styles from './track-list.module.css'
import { pages_for_rows, row_location } from './track-pages.ts'
import { TrackRow } from './track-row.tsx'
import type { Track } from '#renderer/api/types.ts'
import { ContextMenu, type MenuItem } from '#renderer/components/common/context-menu.tsx'
import { node_api, track_page_args, type TrackFilters } from '#renderer/store/api.ts'
import { use_app_selector } from '#renderer/store/index.ts'

const ROW_HEIGHT = 34

// Holds one page's subscription while it is near the viewport.
const PageSubscription = ({ library_address, page, filters }: { library_address: string, page: number, filters: TrackFilters }) => {
  node_api.endpoints.get_tracks.useQuery(track_page_args({ library_address, page, filters }))
  return null
}

export const TrackList = ({ library_address, filters, total, busy, on_play, on_queue, menu_items }: {
  library_address: string
  filters: TrackFilters
  total: number
  busy: boolean
  // The track and the loaded page it sits in, to queue from.
  on_play: (input: { track: Track, page_tracks: Track[], index: number }) => void
  on_queue: (input: { track: Track, at: 'next' | 'end' }) => void
  menu_items: (track: Track) => MenuItem[]
}) => {
  const scroller = useRef<HTMLDivElement>(null)
  const [menu, set_menu] = useState<{ x: number, y: number, track: Track } | null>(null)
  const virtualizer = useVirtualizer({ count: total, getScrollElement: () => scroller.current, estimateSize: () => ROW_HEIGHT, overscan: 12 })
  const rows = virtualizer.getVirtualItems()
  const pages = pages_for_rows({ first_row: rows[0]?.index ?? 0, last_row: rows.at(-1)?.index ?? 0, total })
  const page_data = use_app_selector(
    (state) => pages.map((page) => node_api.endpoints.get_tracks.select(track_page_args({ library_address, page, filters }))(state).data),
    shallowEqual
  )

  return (
    <div className={styles.list} role='table' aria-label='Tracks' aria-busy={busy} data-testid='track-list'>
      <div className={styles.header} role='row'>
        <span role='columnheader'>Title</span>
        <span role='columnheader'>Artist</span>
        <span role='columnheader'>Album</span>
        <span role='columnheader'>Tags</span>
        <span role='columnheader'>Duration</span>
        <span role='columnheader' />
      </div>
      {pages.map((page) => <PageSubscription key={page} library_address={library_address} page={page} filters={filters} />)}
      <div ref={scroller} className={styles.scroller} data-testid='track-scroller'>
        <div className={styles.canvas} style={{ height: virtualizer.getTotalSize() }}>
          {rows.map((row) => {
            const { page, offset } = row_location(row.index)
            const page_tracks = page_data[pages.indexOf(page)]?.items
            const track = page_tracks?.[offset]
            return (
              <div key={row.key} className={styles.slot} style={{ height: row.size, transform: `translateY(${row.start}px)` }}>
                {track === undefined || page_tracks === undefined
                  ? <div className={styles.placeholder} role='row' aria-busy='true' />
                  : (
                    <TrackRow
                      track={track}
                      on_play={() => { on_play({ track, page_tracks, index: offset }) }}
                      on_queue={(at) => { on_queue({ track, at }) }}
                      on_menu={(x, y) => { set_menu({ x, y, track }) }}
                    />
                    )}
              </div>
            )
          })}
        </div>
      </div>
      {menu !== null && <ContextMenu x={menu.x} y={menu.y} items={menu_items(menu.track)} on_close={() => { set_menu(null) }} />}
    </div>
  )
}
