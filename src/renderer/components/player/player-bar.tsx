// The player bar (STYLE.md § Layout › Player bar): a 72px screen under the
// page column, in legacy-v0's thirds — now playing, transport with the seek
// rule, and "playing from". Hidden while nothing is playing and the queue is
// empty. Every control calls player-controller.ts, the one action path.

import { useNavigate } from 'react-router'

import styles from './player-bar.module.css'
import { Artwork } from '#renderer/components/common/artwork.tsx'
import { Avatar } from '#renderer/components/common/avatar.tsx'
import { format_seconds } from '#renderer/components/common/format-seconds.ts'
import { Screen } from '#renderer/components/common/screen.tsx'
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
import { ROUTES } from '#renderer/routes.ts'
import { node_api } from '#renderer/store/api.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { queue_toggled } from '#renderer/store/ui.ts'

const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' }

const meta_line = ({ codec, bitrate }: { codec?: string | null | undefined, bitrate?: number | null | undefined }): string =>
  [codec?.toUpperCase(), bitrate == null || bitrate <= 0 ? undefined : `${Math.round(bitrate / 1000)} kbps`].filter((part) => part !== undefined && part !== '').join(' · ')

export const PlayerBar = () => {
  const dispatch = use_app_dispatch()
  const navigate = useNavigate()
  const { player, current } = use_player()
  const source = use_app_selector((state) => state.player.source)
  const queue_open = use_app_selector((state) => state.ui.queue_open)
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const source_library = source === null || source.library_address === '' ? undefined : libraries.data?.find(({ address }) => address === source.library_address)
  const { queue } = player
  if (queue.entries.length === 0) return null

  const can_toggle = player.state === 'playing' || player.state === 'paused' || player.state === 'ended' ||
    ((player.state === 'idle' || player.state === 'error') && current !== null)
  const duration = player.duration_seconds || (current?.duration_seconds ?? 0)
  const position = Math.min(player.position_seconds, duration)
  const queued_count = queue.entries.slice(queue.index + 1).filter(({ queued }) => queued === true).length
  const buffered = player.state === 'loading' || player.state === 'idle' ? 0 : 1
  const meta = current === null ? '' : meta_line(current)

  return (
    <Screen as='footer' className={styles.bar} data-testid='player-bar' data-state={player.state}>
      <div className={styles.inner}>
        <div className={styles.now_playing}>
          <Artwork cid={current?.artwork} size={56} testid='player-artwork' />
          <div className={styles.text}>
            <span className={styles.title}>{current === null ? 'Nothing playing' : current.title ?? 'Untitled'}</span>
            <span className={styles.artist}>{current?.artist ?? ''}</span>
            <span className={styles.meta}>
              {player.state === 'error' ? `!! ${player.error ?? 'playback failed'}` : meta}
              {current?.tags !== undefined && current.tags.length > 0 && <span className={styles.tags}>{current.tags.join(' ')}</span>}
            </span>
          </div>
        </div>
        <div className={styles.center}>
          <div className={styles.transport}>
            <button
              type='button'
              data-variant='glyph'
              className={styles.word}
              aria-label={`Repeat ${queue.repeat}`}
              aria-pressed={queue.repeat !== 'off'}
              onClick={() => { set_repeat_mode(NEXT_REPEAT[queue.repeat]) }}
            >
              Repeat{queue.repeat === 'one' && ' 1'}
            </button>
            <button type='button' data-variant='glyph' className={styles.word} aria-label='Shuffle' aria-pressed={queue.shuffle} onClick={toggle_shuffle_mode}>Shuffle</button>
            <button type='button' data-variant='glyph' aria-label='Previous' disabled={current === null} onClick={previous_track}>|◀</button>
            <button type='button' data-variant='glyph' className={styles.toggle} aria-label={player.state === 'playing' ? 'Pause' : 'Play'} disabled={!can_toggle} onClick={toggle_playback}>
              {player.state === 'loading' ? <span className={styles.spinner} aria-hidden='true' /> : player.state === 'playing' ? '▮▮' : '▶'}
            </button>
            <button type='button' data-variant='glyph' aria-label='Next' disabled={current === null} onClick={next_track}>▶|</button>
            <button type='button' data-variant='glyph' className={styles.word} aria-expanded={queue_open} onClick={() => { dispatch(queue_toggled()) }}>
              Queue <span className='tabular'>{queued_count}</span>
            </button>
            <button type='button' data-variant='glyph' className={styles.word} onClick={() => { navigate(ROUTES.listens) }}>History</button>
            <label className={styles.volume}>
              <span className='visually-hidden'>Volume</span>
              <input aria-label='Volume' type='range' min={0} max={1} step={0.01} value={player.volume} onChange={(event) => { set_playback_volume(Number(event.target.value)) }} />
              <span className={styles.readout}>{Math.round(player.volume * 100)}</span>
            </label>
          </div>
          <div className={styles.seek_row}>
            <span className={styles.time} data-testid='player-position'>{format_seconds(player.position_seconds)}</span>
            <input
              aria-label='Seek'
              className={styles.seek}
              type='range'
              min={0}
              max={duration}
              step={0.1}
              value={position}
              disabled={player.duration_seconds === 0}
              style={{ '--played': duration > 0 ? position / duration : 0, '--buffered': buffered } as React.CSSProperties}
              onChange={(event) => { seek_playback(Number(event.target.value)) }}
            />
            <span className={styles.time}>{format_seconds(duration)}</span>
          </div>
        </div>
        <div className={styles.from}>
          {source !== null && (
            <button type='button' data-variant='glyph' className={styles.source} onClick={() => { navigate(source.route) }} data-testid='playing-from'>
              <span className={styles.source_text}>
                <span className={styles.kicker}>playing from</span>
                <span className={styles.source_label}>{source.label}</span>
                {source.subtitle !== null && <span className={styles.subtitle}>{source.subtitle}</span>}
              </span>
              {source_library !== undefined && <Avatar name={source.label} size={56} cid={source_library.avatar} />}
            </button>
          )}
        </div>
      </div>
    </Screen>
  )
}
