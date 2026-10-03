// The playback queue as pure functions over an immutable state: the play
// order, the current position, repeat off/one/all, and shuffle (spec
// §8.9.1). Shuffle is Fisher-Yates over everything but the current track,
// which moves to the front, and turning it off restores the order the
// entries had before.

import type { SnapshotQueueEntry } from '#shared/snapshot.ts'

export type RepeatMode = 'off' | 'one' | 'all'

export type QueueEntry = SnapshotQueueEntry

export interface QueueState {
  // In play order.
  entries: QueueEntry[]
  // Index into entries of the current entry; -1 when there is none.
  index: number
  repeat: RepeatMode
  shuffle: boolean
  // While shuffled, the order to return to, kept in step with adds and removes.
  unshuffled: QueueEntry[] | null
}

export const EMPTY_QUEUE: QueueState = { entries: [], index: -1, repeat: 'off', shuffle: false, unshuffled: null }

export const current_entry = (queue: QueueState): QueueEntry | null => queue.entries[queue.index] ?? null

const shuffle_around = ({ entries, index, random }: { entries: QueueEntry[], index: number, random: () => number }): QueueEntry[] => {
  const current = entries[index]
  const rest = entries.filter((_, position) => position !== index)
  for (let position = rest.length - 1; position > 0; position--) {
    const swap = Math.floor(random() * (position + 1))
    const held = rest[position] as QueueEntry
    rest[position] = rest[swap] as QueueEntry
    rest[swap] = held
  }
  return current === undefined ? rest : [current, ...rest]
}

// Replaces the queue, starting at start_index. Shuffle and repeat carry over.
export const set_entries = ({ queue, entries, start_index, random = Math.random }: {
  queue: QueueState
  entries: QueueEntry[]
  start_index: number
  random?: () => number
}): QueueState => {
  const index = entries.length === 0 ? -1 : Math.min(Math.max(start_index, 0), entries.length - 1)
  if (!queue.shuffle) return { ...queue, entries, index, unshuffled: null }
  return { ...queue, entries: shuffle_around({ entries, index, random }), index: index === -1 ? -1 : 0, unshuffled: entries }
}

export const toggle_shuffle = ({ queue, random = Math.random }: { queue: QueueState, random?: () => number }): QueueState => {
  if (queue.shuffle) {
    const original = queue.unshuffled ?? queue.entries
    const current = current_entry(queue)
    const index = current === null ? -1 : original.findIndex(({ queue_id }) => queue_id === current.queue_id)
    return { ...queue, shuffle: false, entries: original, index, unshuffled: null }
  }
  if (queue.index === -1) return { ...queue, shuffle: true, entries: shuffle_around({ entries: queue.entries, index: -1, random }), unshuffled: queue.entries }
  return { ...queue, shuffle: true, entries: shuffle_around({ entries: queue.entries, index: queue.index, random }), index: 0, unshuffled: queue.entries }
}

export const set_repeat = ({ queue, repeat }: { queue: QueueState, repeat: RepeatMode }): QueueState => ({ ...queue, repeat })

// Adds entries right after the current one, or at the end.
export const add_entries = ({ queue, entries, at }: { queue: QueueState, entries: QueueEntry[], at: 'next' | 'end' }): QueueState => {
  const insert_at = at === 'next' ? queue.index + 1 : queue.entries.length
  const next_entries = [...queue.entries.slice(0, insert_at), ...entries, ...queue.entries.slice(insert_at)]
  const index = queue.index === -1 && next_entries.length > 0 ? 0 : queue.index
  return { ...queue, entries: next_entries, index, unshuffled: queue.unshuffled === null ? null : [...queue.unshuffled, ...entries] }
}

// Removes one entry. Removing the current entry makes the following one
// current (or the new last one, at the end).
export const remove_entry = ({ queue, queue_id }: { queue: QueueState, queue_id: string }): QueueState => {
  const position = queue.entries.findIndex((entry) => entry.queue_id === queue_id)
  if (position === -1) return queue
  const entries = queue.entries.filter((entry) => entry.queue_id !== queue_id)
  let index = queue.index
  if (position < queue.index) index--
  else if (position === queue.index) index = Math.min(queue.index, entries.length - 1)
  return { ...queue, entries, index, unshuffled: queue.unshuffled?.filter((entry) => entry.queue_id !== queue_id) ?? null }
}

// Moves the entry at `from` to `to`, keeping the same entry current.
export const move_entry = ({ queue, from, to }: { queue: QueueState, from: number, to: number }): QueueState => {
  if (from === to || from < 0 || to < 0 || from >= queue.entries.length || to >= queue.entries.length) return queue
  const current = current_entry(queue)
  const entries = [...queue.entries]
  const [moved] = entries.splice(from, 1)
  entries.splice(to, 0, moved as QueueEntry)
  const index = current === null ? -1 : entries.findIndex(({ queue_id }) => queue_id === current.queue_id)
  return { ...queue, entries, index }
}

export const jump_to = ({ queue, index }: { queue: QueueState, index: number }): QueueState =>
  index >= 0 && index < queue.entries.length ? { ...queue, index } : queue

// The index that plays when the current track ends on its own: repeat one
// replays it, repeat all wraps, off stops after the last. Null for none.
export const peek_next = (queue: QueueState): number | null => {
  if (queue.index === -1) return null
  if (queue.repeat === 'one') return queue.index
  if (queue.index + 1 < queue.entries.length) return queue.index + 1
  return queue.repeat === 'all' ? 0 : null
}

// Next and previous from the user: repeat one does not hold them on the same
// track, and repeat all wraps at either end.
export const step = ({ queue, direction }: { queue: QueueState, direction: 1 | -1 }): number | null => {
  if (queue.index === -1) return null
  const target = queue.index + direction
  if (target >= 0 && target < queue.entries.length) return target
  return queue.repeat === 'all' ? (target + queue.entries.length) % queue.entries.length : null
}
