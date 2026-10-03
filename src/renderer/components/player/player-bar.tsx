import { useState } from 'react'

import styles from './player-bar.module.css'
import { QueuePanel } from './queue-panel.tsx'
import { format_seconds } from '#renderer/components/common/format-seconds.ts'
import { use_player } from '#renderer/hooks/use-player.ts'
import {
  next_track,
  previous_track,
  seek_playback,
  set_playback_volume,
  set_repeat_mode,
  toggle_playback,
  toggle_shuffle_mode
} from '#renderer/player/player-controller.ts'
import type { RepeatMode } from '#renderer/player/queue-manager.ts'

const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' }

export const PlayerBar = () => {
  const { player, current } = use_player()
  const [queue_open, set_queue_open] = useState(false)
  const { queue } = player
  const can_toggle = player.state === 'playing' || player.state === 'paused' || player.state === 'ended' ||
    ((player.state === 'idle' || player.state === 'error') && current !== null)
  const duration = player.duration_seconds || (current?.duration_seconds ?? 0)

  return (
    <>
      {queue_open && <QueuePanel />}
      <footer className={styles.bar} data-testid='player-bar' data-state={player.state}>
        <div className={styles.controls}>
          <button type='button' aria-label='Previous' disabled={current === null} onClick={previous_track}>Prev</button>
          <button type='button' className={styles.toggle} disabled={!can_toggle} onClick={toggle_playback}>
            {player.state === 'playing' ? 'Pause' : 'Play'}
          </button>
          <button type='button' aria-label='Next' disabled={current === null} onClick={next_track}>Next</button>
        </div>
        <div className={styles.now_playing}>
          <span className={styles.title}>{current === null ? 'Nothing playing' : current.title ?? 'Untitled'}</span>
          <span className={styles.artist}>{current?.artist ?? ''}</span>
          {player.state === 'loading' && <span className={styles.status}>Loading</span>}
          {player.state === 'error' && <span className={styles.error}>{player.error}</span>}
        </div>
        <span className={styles.time} data-testid='player-position'>
          {format_seconds(player.position_seconds)} / {format_seconds(duration)}
        </span>
        <input
          aria-label='Seek'
          className={styles.seek}
          type='range'
          min={0}
          max={duration}
          step={0.1}
          value={Math.min(player.position_seconds, duration)}
          disabled={player.duration_seconds === 0}
          onChange={(event) => { seek_playback(Number(event.target.value)) }}
        />
        <button type='button' aria-pressed={queue.shuffle} className={queue.shuffle ? styles.on : undefined} onClick={toggle_shuffle_mode}>
          Shuffle
        </button>
        <button
          type='button'
          aria-label={`Repeat ${queue.repeat}`}
          className={queue.repeat === 'off' ? undefined : styles.on}
          onClick={() => { set_repeat_mode(NEXT_REPEAT[queue.repeat]) }}
        >
          {queue.repeat === 'one' ? 'Repeat one' : queue.repeat === 'all' ? 'Repeat all' : 'Repeat off'}
        </button>
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
        <button type='button' aria-expanded={queue_open} onClick={() => { set_queue_open(!queue_open) }}>
          Queue ({queue.entries.length})
        </button>
      </footer>
    </>
  )
}
