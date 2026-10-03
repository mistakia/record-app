// One track. Every value from the node is plain text (spec §8.10.6).

import styles from './track-row.module.css'
import type { Track } from '#renderer/api/types.ts'
import { format_seconds } from '#renderer/components/common/format-seconds.ts'
import { use_app_selector } from '#renderer/store/index.ts'

export const TrackRow = ({ track, on_play, on_queue, on_menu }: {
  track: Track
  on_play: () => void
  on_queue: (at: 'next' | 'end') => void
  on_menu: (x: number, y: number) => void
}) => {
  const is_current = use_app_selector((state) => state.player.queue.entries[state.player.queue.index]?.track_id === track.id)
  const queue = on_queue
  return (
    <div
      className={is_current ? `track-row ${styles.row} ${styles.current}` : `track-row ${styles.row}`}
      role='row'
      data-testid='track-row'
      onContextMenu={(event) => {
        event.preventDefault()
        on_menu(event.clientX, event.clientY)
      }}
    >
      <span role='cell' className={styles.cell}>
        <button type='button' className={styles.title} onClick={on_play}>{track.title ?? 'Untitled'}</button>
        {track.is_pinned === true && <span className={styles.pinned} title='Pinned: kept on every device of this identity' data-testid='pinned'>Pinned</span>}
      </span>
      <span role='cell' className={styles.cell}>{track.artist ?? ''}</span>
      <span role='cell' className={styles.cell}>{track.album ?? ''}</span>
      <span role='cell' className={`${styles.cell} ${styles.tags}`}>{track.tags.map(({ tag }) => tag).join(', ')}</span>
      <span role='cell'>{track.duration_seconds == null ? '' : format_seconds(track.duration_seconds)}</span>
      <span role='cell' className={styles.actions}>
        <button type='button' aria-label='Play next' onClick={() => { queue('next') }}>Next</button>
        <button type='button' aria-label='Add to queue' onClick={() => { queue('end') }}>Queue</button>
      </span>
    </div>
  )
}
