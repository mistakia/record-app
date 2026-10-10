// The playback queue as pure functions over an immutable state: the play
// order, the current position, repeat off/one/all, and shuffle (spec
// §8.9.1). Entries the user queued (play next, add to queue) form one block
// right after the current entry, "playing next", ahead of the rest of the
// source list, "back to" (STYLE.md § Layout › Queue); an entry stops being
// queued once it plays. Shuffle is Fisher-Yates over the source entries,
// with the current entry first and the queued block after it, and turning
// it off restores the order the entries had before.

import type { Track } from '#renderer/api/types.ts'
import type { SnapshotQueueEntry } from '#shared/snapshot.ts'

export type RepeatMode = 'off' | 'one' | 'all'

export type QueueEntry = SnapshotQueueEntry

// What an entry keeps of its track for the player bar, taken when it is
// queued and again from the node's newest description while it plays.
export const track_display = (track: Track): Omit<QueueEntry, 'queue_id' | 'track_id' | 'audio_cid' | 'library_address' | 'scope' | 'queued'> => ({
  title: track.title ?? null,
  artist: track.artist ?? null,
  duration_seconds: track.duration_seconds ?? null,
  content_cid: track.content_cid,
  codec: track.codec ?? null,
  bitrate: track.bitrate ?? null,
  artwork: track.artwork?.[0] ?? null,
  tags: [...new Set(track.tags.map(({ tag }) => tag))],
  have_track: track.have_track
})

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

const is_queued = (entry: QueueEntry): boolean => entry.queued === true

// How many entries after the current one are queued: they are contiguous.
export const queued_count = (queue: QueueState): number => {
  let count = 0
  while (queue.entries[queue.index + 1 + count]?.queued === true) count++
  return count
}

// The current entry has played, so it no longer counts as queued.
const consume = (queue: QueueState): QueueState => {
  const current = queue.entries[queue.index]
  if (current === undefined || !is_queued(current)) return queue
  const { queued: _, ...played } = current
  return { ...queue, entries: queue.entries.map((entry, position) => position === queue.index ? played : entry) }
}

// The queued entries moved to just after the current one, in their order.
const queued_after_current = (entries: QueueEntry[], current: QueueEntry | undefined): QueueEntry[] => {
  if (current === undefined) return entries
  const queued = entries.filter((entry) => is_queued(entry) && entry.queue_id !== current.queue_id)
  const rest = entries.filter((entry) => !is_queued(entry) || entry.queue_id === current.queue_id)
  const at = rest.findIndex(({ queue_id }) => queue_id === current.queue_id) + 1
  return [...rest.slice(0, at), ...queued, ...rest.slice(at)]
}

const shuffle_around = ({ entries, index, random }: { entries: QueueEntry[], index: number, random: () => number }): QueueEntry[] => {
  const current = entries[index]
  const queued = entries.filter((entry, position) => position !== index && is_queued(entry))
  const rest = entries.filter((entry, position) => position !== index && !is_queued(entry))
  for (let position = rest.length - 1; position > 0; position--) {
    const swap = Math.floor(random() * (position + 1))
    const held = rest[position] as QueueEntry
    rest[position] = rest[swap] as QueueEntry
    rest[swap] = held
  }
  return current === undefined ? [...queued, ...rest] : [current, ...queued, ...rest]
}

// Replaces the source list, starting at start_index; the queued entries
// still waiting play after the new current one. Shuffle and repeat carry
// over.
export const set_entries = ({ queue, entries: source, start_index, random = Math.random }: {
  queue: QueueState
  entries: QueueEntry[]
  start_index: number
  random?: () => number
}): QueueState => {
  const waiting = queue.entries.slice(queue.index + 1, queue.index + 1 + queued_count(queue))
  const start = source.length === 0 ? -1 : Math.min(Math.max(start_index, 0), source.length - 1)
  const entries = start === -1 ? waiting : [...source.slice(0, start + 1), ...waiting, ...source.slice(start + 1)]
  const index = start === -1 ? (entries.length === 0 ? -1 : 0) : start
  if (!queue.shuffle) return consume({ ...queue, entries, index, unshuffled: null })
  return consume({ ...queue, entries: shuffle_around({ entries, index, random }), index: index === -1 ? -1 : 0, unshuffled: entries })
}

export const toggle_shuffle = ({ queue, random = Math.random }: { queue: QueueState, random?: () => number }): QueueState => {
  if (queue.shuffle) {
    const current = current_entry(queue)
    const original = queued_after_current(queue.unshuffled ?? queue.entries, current ?? undefined)
    const index = current === null ? -1 : original.findIndex(({ queue_id }) => queue_id === current.queue_id)
    return { ...queue, shuffle: false, entries: original, index, unshuffled: null }
  }
  if (queue.index === -1) return { ...queue, shuffle: true, entries: shuffle_around({ entries: queue.entries, index: -1, random }), unshuffled: queue.entries }
  return { ...queue, shuffle: true, entries: shuffle_around({ entries: queue.entries, index: queue.index, random }), index: 0, unshuffled: queue.entries }
}

export const set_repeat = ({ queue, repeat }: { queue: QueueState, repeat: RepeatMode }): QueueState => ({ ...queue, repeat })

// Queues entries: next, right after the current one, or at the end of the
// queued block, still ahead of the rest of the source list.
export const add_entries = ({ queue, entries: added, at }: { queue: QueueState, entries: QueueEntry[], at: 'next' | 'end' }): QueueState => {
  const entries = added.map((entry) => ({ ...entry, queued: true }))
  const insert_at = at === 'next' ? queue.index + 1 : queue.index + 1 + queued_count(queue)
  const next_entries = [...queue.entries.slice(0, insert_at), ...entries, ...queue.entries.slice(insert_at)]
  const index = queue.index === -1 && next_entries.length > 0 ? 0 : queue.index
  return consume({ ...queue, entries: next_entries, index, unshuffled: queue.unshuffled === null ? null : [...queue.unshuffled, ...entries] })
}

// Clears "playing next": every queued entry still waiting.
export const clear_queued = (queue: QueueState): QueueState => {
  const waiting = new Set(queue.entries.slice(queue.index + 1, queue.index + 1 + queued_count(queue)).map(({ queue_id }) => queue_id))
  return {
    ...queue,
    entries: queue.entries.filter(({ queue_id }) => !waiting.has(queue_id)),
    unshuffled: queue.unshuffled?.filter(({ queue_id }) => !waiting.has(queue_id)) ?? null
  }
}

const with_flag = (queue: QueueState, queue_id: string, queued: boolean): QueueState => {
  const flag = (entry: QueueEntry): QueueEntry => {
    if (entry.queue_id !== queue_id) return entry
    const { queued: _, ...rest } = entry
    return queued ? { ...rest, queued: true } : rest
  }
  return { ...queue, entries: queue.entries.map(flag), unshuffled: queue.unshuffled?.map(flag) ?? null }
}

// Moves an upcoming entry one place (Alt+↑/↓). Past the edge of its list it
// crosses into the other: the last queued entry moving down becomes the
// first of the source list, and the first source entry moving up becomes
// the last queued one.
export const nudge_entry = ({ queue, queue_id, direction }: { queue: QueueState, queue_id: string, direction: 1 | -1 }): QueueState => {
  const position = queue.entries.findIndex((entry) => entry.queue_id === queue_id)
  if (position <= queue.index) return queue
  const boundary = queue.index + 1 + queued_count(queue)
  const queued = position < boundary
  if (queued && direction === 1 && position === boundary - 1) return with_flag(queue, queue_id, false)
  if (!queued && direction === -1 && position === boundary) return with_flag(queue, queue_id, true)
  const target = position + direction
  if (target <= queue.index || target >= queue.entries.length) return queue
  return move_entry({ queue, from: position, to: target })
}

// Moves an upcoming entry to a place in "playing next" or "back to", as a
// drag does; offset counts within that list.
export const place_entry = ({ queue, queue_id, list, offset }: { queue: QueueState, queue_id: string, list: 'queued' | 'source', offset: number }): QueueState => {
  const position = queue.entries.findIndex((entry) => entry.queue_id === queue_id)
  if (position <= queue.index) return queue
  const flagged = with_flag(queue, queue_id, list === 'queued')
  const moving = flagged.entries[position] as QueueEntry
  const entries = flagged.entries.filter((_, at) => at !== position)
  const without = { ...flagged, entries }
  const start = list === 'queued' ? without.index + 1 : without.index + 1 + queued_count(without)
  const limit = list === 'queued' ? queued_count(without) : entries.length - start
  const insert_at = start + Math.min(Math.max(offset, 0), limit)
  return { ...flagged, entries: [...entries.slice(0, insert_at), moving, ...entries.slice(insert_at)] }
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
  index >= 0 && index < queue.entries.length ? consume({ ...queue, index }) : queue

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
