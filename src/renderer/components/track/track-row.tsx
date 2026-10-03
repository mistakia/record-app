import styles from './track-row.module.css'
import type { Track } from '#renderer/api/types.ts'
import { format_seconds } from '#renderer/components/common/format-seconds.ts'
import { use_app_selector } from '#renderer/store/index.ts'

export const TrackRow = ({ track, on_play, on_queue }: {
  track: Track
  on_play: () => void
  on_queue: (at: 'next' | 'end') => void
}) => {
  const is_current = use_app_selector((state) => state.player.queue.entries[state.player.queue.index]?.track_id === track.id)
  return (
    <tr className={is_current ? `${styles.row} ${styles.current}` : styles.row}>
      <td>
        <button type='button' className={styles.title} onClick={on_play}>
          {track.title ?? 'Untitled'}
        </button>
      </td>
      <td>{track.artist ?? ''}</td>
      <td>{track.album ?? ''}</td>
      <td>{track.duration_seconds == null ? '' : format_seconds(track.duration_seconds)}</td>
      <td className={styles.actions}>
        <button type='button' aria-label='Play next' onClick={() => { on_queue('next') }}>Next</button>
        <button type='button' aria-label='Add to queue' onClick={() => { on_queue('end') }}>Queue</button>
      </td>
    </tr>
  )
}
