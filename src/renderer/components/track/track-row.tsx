import styles from './track-row.module.css'
import type { Track } from '#renderer/api/types.ts'
import { format_seconds } from '#renderer/components/common/format-seconds.ts'
import { play_track } from '#renderer/player/player-controller.ts'
import { use_app_selector } from '#renderer/store/index.ts'

export const TrackRow = ({ track }: { track: Track }) => {
  const is_current = use_app_selector((state) => state.player.track?.track_id === track.id)
  return (
    <tr className={is_current ? `${styles.row} ${styles.current}` : styles.row}>
      <td>
        <button type='button' className={styles.title} onClick={() => { play_track(track) }}>
          {track.title ?? 'Untitled'}
        </button>
      </td>
      <td>{track.artist ?? ''}</td>
      <td>{track.album ?? ''}</td>
      <td>{track.duration_seconds == null ? '' : format_seconds(track.duration_seconds)}</td>
    </tr>
  )
}
