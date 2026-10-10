// The queue overlay (STYLE.md § Layout › Queue): a screen over the page
// column with the playing track's artwork under the glass, "playing next"
// (what the user queued), and "back to" the source list. Entries play on
// click, reorder by dragging or Alt+↑/↓ across both lists, and leave with
// Backspace. ▼ or Esc closes it.

import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'

import styles from './queue-panel.module.css'
import { Artwork } from '#renderer/components/common/artwork.tsx'
import { format_seconds } from '#renderer/components/common/format-seconds.ts'
import { Screen } from '#renderer/components/common/screen.tsx'
import { tip } from '#renderer/components/common/tooltip-logic.ts'
import { use_player } from '#renderer/hooks/use-player.ts'
import { clear_playing_next, jump_to_entry, nudge_in_queue, place_in_queue, remove_from_queue, toggle_playback } from '#renderer/player/player-controller.ts'
import { queued_count, type QueueEntry } from '#renderer/player/queue-manager.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { queue_toggled } from '#renderer/store/ui.ts'

type List = 'queued' | 'source'

const Entry = ({ entry, index, list, offset, on_drag }: {
  entry: QueueEntry
  index: number
  list: List
  offset: number
  on_drag: (queue_id: string) => void
}) => {
  const on_key_down = (event: KeyboardEvent) => {
    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault()
      event.stopPropagation()
      nudge_in_queue({ queue_id: entry.queue_id, direction: event.key === 'ArrowUp' ? -1 : 1 })
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      event.stopPropagation()
      const sibling = (event.currentTarget.nextElementSibling ?? event.currentTarget.previousElementSibling) as HTMLElement | null
      remove_from_queue(entry.queue_id)
      sibling?.focus()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      jump_to_entry(index)
    }
  }
  return (
    <li
      className={styles.entry}
      data-testid='queue-entry'
      data-list={list}
      data-offset={offset}
      tabIndex={0}
      draggable
      onDragStart={() => { on_drag(entry.queue_id) }}
      onKeyDown={on_key_down}
    >
      <button type='button' data-variant='glyph' className={styles.play} tabIndex={-1} aria-label={`Play ${entry.title ?? 'Untitled'}`} {...tip('Play')} onClick={() => { jump_to_entry(index) }}>▶</button>
      <span className={styles.text}>
        <span className={styles.title}>{entry.title ?? 'Untitled'}</span>
        <span className={styles.artist}>{entry.artist ?? ''}</span>
      </span>
      <button type='button' data-variant='glyph' className={styles.remove} tabIndex={-1} aria-label='Remove from queue' {...tip('Remove from queue')} onClick={() => { remove_from_queue(entry.queue_id) }}>×</button>
      <span className={styles.duration}>{entry.duration_seconds == null ? '' : format_seconds(entry.duration_seconds)}</span>
    </li>
  )
}

export const QueuePanel = () => {
  const dispatch = use_app_dispatch()
  const { player, current } = use_player()
  const source = use_app_selector((state) => state.player.source)
  const { queue } = player
  const count = queued_count(queue)
  const upcoming_start = queue.index + 1
  const queued = queue.entries.slice(upcoming_start, upcoming_start + count)
  const rest = queue.entries.slice(upcoming_start + count)
  const [dragging, set_dragging] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-testid=queue-entry]')?.focus()
    const on_escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open], [role=menu]') !== null) return
      event.preventDefault()
      event.stopPropagation()
      dispatch(queue_toggled(false))
    }
    window.addEventListener('keydown', on_escape, true)
    return () => { window.removeEventListener('keydown', on_escape, true) }
  }, [dispatch])

  // A drop lands before the entry under the pointer, or at the list's end.
  const drop = (list: List) => (event: DragEvent) => {
    event.preventDefault()
    if (dragging === null) return
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-testid=queue-entry]')
    const offset = target?.dataset.list === list ? Number(target.dataset.offset) : (list === 'queued' ? queued.length : rest.length)
    place_in_queue({ queue_id: dragging, list, offset })
    set_dragging(null)
  }

  return (
    <Screen className={styles.overlay} data-testid='queue-panel' aria-label='Queue' role='region'>
      <div ref={ref} className={styles.layout}>
        <div className={styles.art}>
          <button type='button' data-variant='glyph' className={styles.collapse} aria-label='Close queue' {...tip('Close queue', 'toggle_queue')} onClick={() => { dispatch(queue_toggled(false)) }}>▼</button>
          <div className={styles.art_frame}>
            <Artwork cid={current?.artwork} size={280} />
            <div className='screen__glass screen__glass--over' aria-hidden='true' />
          </div>
          {current !== null && (
            <button type='button' data-variant='glyph' className={styles.now} onClick={toggle_playback}>
              <span className={player.state === 'playing' ? 'on-air' : undefined}>{player.state === 'playing' ? 'playing' : 'paused'}</span>
              <span className={styles.now_title}>{current.title ?? 'Untitled'}</span>
              <span className={styles.artist}>{current.artist ?? ''}</span>
            </button>
          )}
        </div>
        <div className={styles.lists}>
          <section onDragOver={(event) => { event.preventDefault() }} onDrop={drop('queued')}>
            <header className={styles.heading}>
              <span className='screen-label'>playing next</span>
              {queued.length > 0 && <button type='button' data-variant='glyph' className={styles.clear} onClick={clear_playing_next}>[clear]</button>}
            </header>
            {queued.length === 0
              ? <p className={styles.empty}>Nothing queued. n plays a track next, q adds it here.</p>
              : <ol className={styles.list}>{queued.map((entry, offset) => <Entry key={entry.queue_id} entry={entry} index={upcoming_start + offset} list='queued' offset={offset} on_drag={set_dragging} />)}</ol>}
          </section>
          <section onDragOver={(event) => { event.preventDefault() }} onDrop={drop('source')}>
            <header className={styles.heading}>
              <span className='screen-label'>back to {source?.label ?? 'the list'}</span>
              {queue.shuffle && <span className={styles.flag}>shuffling</span>}
            </header>
            <ol className={styles.list}>{rest.map((entry, offset) => <Entry key={entry.queue_id} entry={entry} index={upcoming_start + count + offset} list='source' offset={offset} on_drag={set_dragging} />)}</ol>
          </section>
        </div>
      </div>
    </Screen>
  )
}
