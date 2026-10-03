// The queue in play order: the current entry marked, click to play an
// entry, reorder by dragging or with the move buttons, and remove.

import { useState } from 'react'

import styles from './queue-panel.module.css'
import { format_seconds } from '#renderer/components/common/format-seconds.ts'
import { use_player } from '#renderer/hooks/use-player.ts'
import { jump_to_entry, move_in_queue, remove_from_queue } from '#renderer/player/player-controller.ts'

export const QueuePanel = () => {
  const { player } = use_player()
  const { entries, index: current_index } = player.queue
  const [dragged, set_dragged] = useState<number | null>(null)

  return (
    <aside className={styles.panel} data-testid='queue-panel' aria-label='Queue'>
      {entries.length === 0 && <p className={styles.empty}>The queue is empty.</p>}
      <ol className={styles.list}>
        {entries.map((entry, index) => (
          <li
            key={entry.queue_id}
            className={index === current_index ? `${styles.entry} ${styles.current}` : styles.entry}
            data-testid='queue-entry'
            aria-current={index === current_index ? 'true' : undefined}
            draggable
            onDragStart={() => { set_dragged(index) }}
            onDragOver={(event) => { event.preventDefault() }}
            onDrop={(event) => {
              event.preventDefault()
              if (dragged !== null) move_in_queue({ from: dragged, to: index })
              set_dragged(null)
            }}
          >
            <button type='button' className={styles.title} onClick={() => { jump_to_entry(index) }}>
              {entry.title ?? 'Untitled'}
              <span className={styles.artist}>{entry.artist ?? ''}</span>
            </button>
            <span className={styles.duration}>{entry.duration_seconds == null ? '' : format_seconds(entry.duration_seconds)}</span>
            <button type='button' aria-label='Move up' disabled={index === 0} onClick={() => { move_in_queue({ from: index, to: index - 1 }) }}>Up</button>
            <button type='button' aria-label='Move down' disabled={index === entries.length - 1} onClick={() => { move_in_queue({ from: index, to: index + 1 }) }}>Down</button>
            <button type='button' aria-label='Remove' onClick={() => { remove_from_queue(entry.queue_id) }}>Remove</button>
          </li>
        ))}
      </ol>
    </aside>
  )
}
