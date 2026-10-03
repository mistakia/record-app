import styles from './player-bar.module.css'
import { format_seconds } from '#renderer/components/common/format-seconds.ts'
import { seek_playback, set_playback_volume, toggle_playback } from '#renderer/player/player-controller.ts'
import { use_app_selector } from '#renderer/store/index.ts'

export const PlayerBar = () => {
  const player = use_app_selector((state) => state.player)
  const can_toggle = player.state === 'playing' || player.state === 'paused' || player.state === 'ended' ||
    ((player.state === 'idle' || player.state === 'error') && player.track !== null)

  return (
    <footer className={styles.bar} data-testid='player-bar' data-state={player.state}>
      <button type='button' className={styles.toggle} disabled={!can_toggle} onClick={toggle_playback}>
        {player.state === 'playing' ? 'Pause' : 'Play'}
      </button>
      <div className={styles.now_playing}>
        <span className={styles.title}>{player.track?.title ?? (player.track === null ? 'Nothing playing' : 'Untitled')}</span>
        <span className={styles.artist}>{player.track?.artist ?? ''}</span>
        {player.state === 'loading' && <span className={styles.status}>Loading</span>}
        {player.state === 'error' && <span className={styles.error}>{player.error}</span>}
      </div>
      <span className={styles.time} data-testid='player-position'>
        {format_seconds(player.position_seconds)} / {format_seconds(player.duration_seconds)}
      </span>
      <input
        aria-label='Seek'
        className={styles.seek}
        type='range'
        min={0}
        max={player.duration_seconds || 0}
        step={0.1}
        value={player.position_seconds}
        disabled={player.duration_seconds === 0}
        onChange={(event) => { seek_playback(Number(event.target.value)) }}
      />
      <input
        aria-label='Volume'
        className={styles.volume}
        type='range'
        min={0}
        max={1}
        step={0.01}
        value={player.volume}
        onChange={(event) => { set_playback_volume(Number(event.target.value)) }}
      />
    </footer>
  )
}
