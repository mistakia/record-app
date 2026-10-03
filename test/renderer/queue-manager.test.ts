import { describe, expect, test } from 'bun:test'

import {
  add_entries,
  current_entry,
  EMPTY_QUEUE,
  jump_to,
  move_entry,
  peek_next,
  remove_entry,
  set_entries,
  set_repeat,
  step,
  toggle_shuffle,
  type QueueEntry,
  type QueueState
} from '#renderer/player/queue-manager.ts'

const entry = (name: string): QueueEntry => ({
  queue_id: `q-${name}`,
  track_id: name,
  audio_cid: `cid-${name}`,
  title: name,
  artist: null,
  duration_seconds: 100,
  library_address: '/record/a/record'
})

const ids = (queue: QueueState) => queue.entries.map(({ track_id }) => track_id).join('')
const queue_of = (names: string, start_index = 0) => set_entries({ queue: EMPTY_QUEUE, entries: [...names].map(entry), start_index })

// A deterministic random sequence for shuffle tests.
const sequence = (...values: number[]) => {
  let position = 0
  return () => values[position++ % values.length] as number
}

describe('queue manager', () => {
  test('set_entries clamps the start and an empty queue has no current entry', () => {
    expect(queue_of('abc', 1).index).toBe(1)
    expect(queue_of('abc', 9).index).toBe(2)
    expect(set_entries({ queue: EMPTY_QUEUE, entries: [], start_index: 0 }).index).toBe(-1)
    expect(current_entry(EMPTY_QUEUE)).toBeNull()
    expect(peek_next(EMPTY_QUEUE)).toBeNull()
  })

  test('peek_next follows repeat off, all, and one', () => {
    const at_end = queue_of('abc', 2)
    expect(peek_next(queue_of('abc', 0))).toBe(1)
    expect(peek_next(at_end)).toBeNull()
    expect(peek_next(set_repeat({ queue: at_end, repeat: 'all' }))).toBe(0)
    expect(peek_next(set_repeat({ queue: at_end, repeat: 'one' }))).toBe(2)
  })

  test('step moves past repeat one and wraps only under repeat all', () => {
    const one = set_repeat({ queue: queue_of('abc', 1), repeat: 'one' })
    expect(step({ queue: one, direction: 1 })).toBe(2)
    expect(step({ queue: one, direction: -1 })).toBe(0)
    expect(step({ queue: queue_of('abc', 0), direction: -1 })).toBeNull()
    expect(step({ queue: set_repeat({ queue: queue_of('abc', 0), repeat: 'all' }), direction: -1 })).toBe(2)
    expect(step({ queue: set_repeat({ queue: queue_of('abc', 2), repeat: 'all' }), direction: 1 })).toBe(0)
  })

  test('shuffle keeps the current entry first, is Fisher-Yates over the rest, and unshuffle restores order and the current entry', () => {
    const queue = queue_of('abcde', 2)
    // With random() = 0 every step swaps position i with 0. The rest is
    // a b d e: i=3 gives e b d a, i=2 gives d b e a, i=1 gives b d e a.
    const shuffled = toggle_shuffle({ queue, random: () => 0 })
    expect(ids(shuffled)).toBe('cbdea')
    expect(shuffled.index).toBe(0)
    expect(current_entry(shuffled)?.track_id).toBe('c')

    const moved_on = jump_to({ queue: shuffled, index: 3 })
    const restored = toggle_shuffle({ queue: moved_on })
    expect(ids(restored)).toBe('abcde')
    expect(current_entry(restored)?.track_id).toBe('e')
    expect(restored.unshuffled).toBeNull()
  })

  test('every shuffle is a permutation with the current entry first', () => {
    for (let trial = 0; trial < 50; trial++) {
      const shuffled = toggle_shuffle({ queue: queue_of('abcdefgh', trial % 8) })
      expect([...ids(shuffled)].sort().join('')).toBe('abcdefgh')
      expect(shuffled.entries[0]?.track_id).toBe('abcdefgh'[trial % 8])
    }
  })

  test('set_entries while shuffled shuffles the new entries around the start', () => {
    const shuffled = toggle_shuffle({ queue: EMPTY_QUEUE })
    const queue = set_entries({ queue: shuffled, entries: [...'wxyz'].map(entry), start_index: 2, random: sequence(0.99) })
    expect(current_entry(queue)?.track_id).toBe('y')
    expect(queue.index).toBe(0)
    expect(ids(toggle_shuffle({ queue }))).toBe('wxyz')
  })

  test('add puts entries next or at the end, and keeps the unshuffled order in step', () => {
    expect(ids(add_entries({ queue: queue_of('abc', 0), entries: [entry('x')], at: 'next' }))).toBe('axbc')
    expect(ids(add_entries({ queue: queue_of('abc', 0), entries: [entry('x')], at: 'end' }))).toBe('abcx')
    const empty_then_added = add_entries({ queue: EMPTY_QUEUE, entries: [entry('x')], at: 'end' })
    expect(empty_then_added.index).toBe(0)
    const shuffled = toggle_shuffle({ queue: queue_of('abc', 0), random: () => 0 })
    const added = add_entries({ queue: shuffled, entries: [entry('x')], at: 'next' })
    expect(ids(toggle_shuffle({ queue: added }))).toBe('abcx')
  })

  test('remove keeps the current entry, or moves to the following one when the current is removed', () => {
    expect(current_entry(remove_entry({ queue: queue_of('abc', 2), queue_id: 'q-a' }))?.track_id).toBe('c')
    expect(current_entry(remove_entry({ queue: queue_of('abc', 1), queue_id: 'q-b' }))?.track_id).toBe('c')
    expect(current_entry(remove_entry({ queue: queue_of('abc', 2), queue_id: 'q-c' }))?.track_id).toBe('b')
    expect(remove_entry({ queue: queue_of('a', 0), queue_id: 'q-a' }).index).toBe(-1)
    expect(remove_entry({ queue: queue_of('abc', 0), queue_id: 'nope' })).toEqual(queue_of('abc', 0))
  })

  test('move reorders and keeps the same entry current', () => {
    const moved = move_entry({ queue: queue_of('abcd', 1), from: 0, to: 3 })
    expect(ids(moved)).toBe('bcda')
    expect(current_entry(moved)?.track_id).toBe('b')
    expect(move_entry({ queue: queue_of('abc', 0), from: 0, to: 9 })).toEqual(queue_of('abc', 0))
  })
})
