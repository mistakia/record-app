// The player bar (STYLE.md § Layout › Player bar): a 75px screen under the
// page column, laid out as legacy-v0's player — now playing (adopt, artwork,
// title, artist, meta, tags), the transport over its timeline, and "playing
// from". Hidden while nothing is playing and the queue is empty. Every
// control calls player-controller.ts, the one action path.

import { useState } from 'react'
import { useNavigate } from 'react-router'

import styles from './player-bar.module.css'
import { HistoryIcon, QueueIcon, RepeatIcon, ShuffleIcon } from './transport-icons.tsx'
import { Artwork } from '#renderer/components/common/artwork.tsx'
import { Avatar } from '#renderer/components/common/avatar.tsx'
import { format_seconds } from '#renderer/components/common/format-seconds.ts'
import { Screen } from '#renderer/components/common/screen.tsx'
import { AdoptDialog } from '#renderer/components/track/adopt-dialog.tsx'
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
  const [adopting, set_adopting] = useState(false)
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
  const adoptable = current?.content_cid !== undefined

  return (
    <>
      <Screen as='footer' className={styles.bar} data-testid='player-bar' data-state={player.state}>
        <div className={styles.inner}>
          <div className={styles.now_playing}>
            <div className={styles.adopt}>
              <button
                type='button'
                data-variant='glyph'
                className={current?.have_track === true ? `${styles.star} ${styles.held}` : styles.star}
                aria-label={current?.have_track === true ? 'In your library; adopt to another' : 'Adopt to library'}
                disabled={!adoptable}
                onClick={() => { set_adopting(true) }}
              >
                ★
              </button>
            </div>
            <Artwork cid={current?.artwork} size={65} testid='player-artwork' />
            <div className={styles.text}>
              <span className={styles.title}>{current === null ? 'Nothing playing' : current.title ?? 'Untitled'}</span>
              <span className={styles.artist}>{current?.artist ?? ''}</span>
              <span className={styles.meta}>{player.state === 'error' ? `!! ${player.error ?? 'playback failed'}` : meta}</span>
              {current?.tags !== undefined && current.tags.length > 0 && (
                <span className={styles.tags}>
                  {current.tags.map((tag) => <span key={tag} className={styles.chip}>{tag}</span>)}
                </span>
              )}
            </div>
          </div>
          <div className={styles.center}>
            <div className={styles.transport}>
              <button
                type='button'
                data-variant='glyph'
                aria-label={`Repeat ${queue.repeat}`}
                aria-pressed={queue.repeat !== 'off'}
                title={`Repeat: ${queue.repeat}`}
                onClick={() => { set_repeat_mode(NEXT_REPEAT[queue.repeat]) }}
              >
                <RepeatIcon one={queue.repeat === 'one'} />
              </button>
              <button type='button' data-variant='glyph' aria-label='Shuffle' aria-pressed={queue.shuffle} title='Shuffle' onClick={toggle_shuffle_mode}>
                <ShuffleIcon />
              </button>
              <button type='button' data-variant='glyph' aria-label='Previous' disabled={current === null} onClick={previous_track}>|◀</button>
              <button type='button' data-variant='glyph' className={styles.toggle} aria-label={player.state === 'playing' ? 'Pause' : 'Play'} disabled={!can_toggle} onClick={toggle_playback}>
                {player.state === 'loading' ? <span className={styles.spinner} aria-hidden='true' /> : player.state === 'playing' ? '▮▮' : '▶'}
              </button>
              <button type='button' data-variant='glyph' aria-label='Next' disabled={current === null} onClick={next_track}>▶|</button>
              <button type='button' data-variant='glyph' aria-label={`Queue, ${queued_count} queued`} aria-pressed={queue_open} aria-expanded={queue_open} title='Play queue' onClick={() => { dispatch(queue_toggled()) }}>
                <QueueIcon />
                {queued_count > 0 && <span className={styles.badge}>{queued_count}</span>}
              </button>
              <button type='button' data-variant='glyph' aria-label='History' title='Listening history' onClick={() => { navigate(ROUTES.listens) }}>
                <HistoryIcon />
              </button>
            </div>
            <div className={styles.timeline}>
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
            <label className={styles.volume}>
              <input aria-label='Volume' type='range' min={0} max={1} step={0.01} value={player.volume} onChange={(event) => { set_playback_volume(Number(event.target.value)) }} />
              <span className={styles.readout}>{Math.round(player.volume * 100)}</span>
            </label>
            {source !== null && (
              <button type='button' data-variant='glyph' className={styles.source} onClick={() => { navigate(source.route) }} data-testid='playing-from'>
                <span className={styles.source_text}>
                  <span className={styles.source_label}>{source.label}</span>
                  {source.subtitle !== null && <span className={styles.subtitle}>{source.subtitle}</span>}
                  <span className={styles.kicker}>Playing from</span>
                </span>
                {source_library !== undefined && <Avatar address={source_library.address} size={65} cid={source_library.avatar} />}
              </button>
            )}
          </div>
        </div>
      </Screen>
      {adopting && current?.content_cid !== undefined && (
        <AdoptDialog
          track={{ content_cid: current.content_cid, title: current.title, library_addresses: [current.library_address] }}
          viewed_library=''
          on_close={() => { set_adopting(false) }}
        />
      )}
    </>
  )
}
