// One track (STYLE.md § Components › Track list). At rest: index, title,
// artist, album, quiet tags and metadata. On hover or under the cursor the
// index becomes play, +TAG and the menu appear, and the star brightens.
// Every value from the node is plain text (spec §8.10.6).

import { memo, type MouseEvent } from 'react'

import styles from './track-row.module.css'
import type { Column } from './columns.ts'
import type { Track } from '#renderer/api/types.ts'
import { format_seconds } from '#renderer/components/common/format-seconds.ts'
import { ragged_width, SkeletonBar } from '#renderer/components/common/skeleton.tsx'

export type RowPlayState = 'playing' | 'loading' | 'paused' | null

// One set for the whole list, stable across renders, so a row re-renders
// only when its own track or state changes. Each takes the row's index.
export interface RowHandlers {
  on_play: (row: number) => void
  on_click: (row: number, event: MouseEvent) => void
  on_double_click: (row: number) => void
  on_menu: (row: number, x: number, y: number) => void
  on_adopt: (track: Track) => void
  on_add_tag: (row: number, track: Track) => void
  on_tag: (input: { tag: string, library_address: string }) => void
  on_remove_tag: (input: { track: Track, tag: string, library_address: string }) => void
}

const kbps = (bitrate: number | null | undefined): string => bitrate == null || bitrate <= 0 ? '' : String(Math.round(bitrate / 1000))

const cell_text = (track: Track, column: Column): string => {
  switch (column.id) {
    case 'artist': return track.artist ?? ''
    case 'album': return track.album ?? ''
    case 'kbps': return kbps(track.bitrate)
    case 'time': return track.duration_seconds == null ? '' : format_seconds(track.duration_seconds)
    case 'format': return track.codec?.toUpperCase() ?? ''
    case 'listens': return track.listen_count > 0 ? String(track.listen_count) : ''
    case 'tags': return ''
  }
}

const Tags = ({ track, removable, handlers }: { track: Track, removable: ReadonlySet<string>, handlers: RowHandlers }) => (
  <span role='cell' className={`${styles.cell} ${styles.tags}`}>
    {track.tags.map(({ tag, library_address }) => (
      <span key={`${library_address} ${tag}`} className={styles.chip}>
        <button
          type='button'
          data-variant='glyph'
          tabIndex={-1}
          onClick={(event) => {
            event.stopPropagation()
            handlers.on_tag({ tag, library_address })
          }}
        >
          {tag}
        </button>
        {removable.has(library_address) && (
          <button
            type='button'
            data-variant='glyph'
            className={styles.chip_remove}
            tabIndex={-1}
            aria-label={`Remove tag ${tag}`}
            onClick={(event) => {
              event.stopPropagation()
              handlers.on_remove_tag({ track, tag, library_address })
            }}
          >
            ×
          </button>
        )}
      </span>
    ))}
  </span>
)

export const TrackRow = memo(({ track, index, columns, play_state, is_cursor, is_selected, menu_open, removable, handlers }: {
  track: Track
  // Own active libraries, whose tags the row may remove.
  removable: ReadonlySet<string>
  index: number
  columns: readonly Column[]
  play_state: RowPlayState
  is_cursor: boolean
  is_selected: boolean
  menu_open: boolean
  handlers: RowHandlers
}) => {
  const classes = [
    'track-row',
    styles.row,
    play_state !== null ? styles.current : '',
    is_cursor ? styles.cursor : '',
    is_selected ? styles.selected : '',
    menu_open ? styles.menu_open : ''
  ].filter((name) => name !== '').join(' ')
  const lead = columns.filter(({ lead: is_lead }) => is_lead === true)
  const rest = columns.filter(({ lead: is_lead }) => is_lead !== true)
  const render_column = (column: Column) => column.id === 'tags'
    ? <Tags key='tags' track={track} removable={removable} handlers={handlers} />
    : (
      <span key={column.id} role='cell' className={[styles.cell, column.quiet === true ? styles.quiet : '', column.align === 'end' ? styles.end : '', column.id === 'artist' || column.id === 'album' ? styles.secondary : ''].join(' ')}>
        {cell_text(track, column)}
      </span>
      )

  return (
    <div
      className={classes}
      role='row'
      aria-selected={is_selected}
      data-testid='track-row'
      data-cursor={is_cursor ? '' : undefined}
      onClick={(event) => { handlers.on_click(index, event) }}
      onDoubleClick={() => { handlers.on_double_click(index) }}
      onContextMenu={(event) => {
        event.preventDefault()
        handlers.on_menu(index, event.clientX, event.clientY)
      }}
    >
      <span role='cell' className={styles.index}>
        <span className={styles.number}>{index + 1}</span>
        <button
          type='button'
          data-variant='glyph'
          className={styles.play}
          tabIndex={-1}
          aria-label={play_state === 'playing' ? 'Pause' : 'Play'}
          onClick={(event) => {
            event.stopPropagation()
            handlers.on_play(index)
          }}
        >
          {play_state === 'loading' ? <span className={styles.spinner} aria-hidden='true' /> : play_state === 'playing' ? '▮▮' : '▶'}
        </button>
      </span>
      <span role='cell'>
        <button
          type='button'
          data-variant='glyph'
          className={track.have_track ? `${styles.star} ${styles.held}` : styles.star}
          tabIndex={-1}
          aria-label={track.have_track ? 'In your library; adopt to another' : 'Adopt to library'}
          onClick={(event) => {
            event.stopPropagation()
            handlers.on_adopt(track)
          }}
        >
          ★
        </button>
      </span>
      <span role='cell' className={`${styles.cell} ${styles.title_cell}`}>
        <span className={styles.title}>{track.title ?? 'Untitled'}</span>
        {track.is_pinned === true && <span className={styles.pinned} aria-label='Pinned' data-testid='pinned'>◆</span>}
      </span>
      {lead.map(render_column)}
      <span role='cell'>
        <button
          type='button'
          data-variant='glyph'
          className={styles.add_tag}
          tabIndex={-1}
          aria-label='Add tag'
          onClick={(event) => {
            event.stopPropagation()
            handlers.on_add_tag(index, track)
          }}
        >
          +tag
        </button>
      </span>
      {rest.map(render_column)}
      <span role='cell'>
        <button
          type='button'
          data-variant='glyph'
          className={styles.more}
          tabIndex={-1}
          aria-label='Track menu'
          onClick={(event) => {
            event.stopPropagation()
            const rect = event.currentTarget.getBoundingClientRect()
            handlers.on_menu(index, rect.left, rect.bottom)
          }}
        >
          …
        </button>
      </span>
    </div>
  )
})

// Ragged width ranges per column kind, in percent of the cell.
const SKELETON_WIDTHS: Record<Column['id'], [number, number]> = {
  artist: [35, 80],
  album: [30, 75],
  tags: [20, 55],
  kbps: [55, 75],
  time: [60, 80],
  format: [60, 80],
  listens: [25, 45]
}

// A loading row on the same column grid as TrackRow: a bar per column,
// none under the adopt, +TAG, and menu columns.
export const TrackRowSkeleton = ({ index, columns }: { index: number, columns: readonly Column[] }) => {
  const bar = (column: Column, position: number) => {
    const [min, max] = SKELETON_WIDTHS[column.id]
    return (
      <span key={column.id} className={styles.skeleton_cell}>
        <SkeletonBar width={ragged_width(index, position, min, max)} row={index} align={column.align} />
      </span>
    )
  }
  return (
    <div className={styles.skeleton} role='row' aria-busy='true' data-testid='track-row-skeleton'>
      <span className={styles.skeleton_cell}><SkeletonBar width={ragged_width(index, 0, 40, 70)} row={index} align='end' /></span>
      <span />
      <span className={styles.skeleton_cell}><SkeletonBar width={ragged_width(index, 1, 40, 85)} row={index} /></span>
      {columns.filter(({ lead }) => lead === true).map((column, position) => bar(column, position + 2))}
      <span />
      {columns.filter(({ lead }) => lead !== true).map((column, position) => bar(column, position + 10))}
      <span />
    </div>
  )
}
