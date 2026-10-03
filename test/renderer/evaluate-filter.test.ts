// FilterSpec evaluation (spec §3.5.7) and the replication-policy storage
// estimate built on it.

import { describe, expect, test } from 'bun:test'

import type { Track } from '#renderer/api/types.ts'
import { estimate_storage, evaluate_filter, format_bytes, track_view } from '#renderer/filter/evaluate-filter.ts'

const track = (overrides: Partial<Track>): Track => ({
  id: 'a'.repeat(64),
  content_cid: 'zContent',
  audio_cid: 'bAudio',
  audio_size_bytes: 1_000_000,
  tags: [],
  listen_count: 0,
  have_track: false,
  ...overrides
})

describe('evaluate_filter', () => {
  const subject = { tags: ['house', 'live'], artist: 'Daft Punk', duration_seconds: 300, nested: { n: 1 }, flag: null }

  test('match, any_of, and range per §3.5.7, with arrays matching on any element', () => {
    expect(evaluate_filter({ type: 'match', fields: { tags: 'house', artist: 'Daft Punk' } }, subject)).toBe(true)
    expect(evaluate_filter({ type: 'match', fields: { 'nested.n': 1 } }, subject)).toBe(true)
    expect(evaluate_filter({ type: 'match', fields: { 'nested.n': '1' } }, subject)).toBe(false)
    expect(evaluate_filter({ type: 'match', fields: { flag: null } }, subject)).toBe(true)
    expect(evaluate_filter({ type: 'match', fields: { missing: null } }, subject)).toBe(false)
    expect(evaluate_filter({ type: 'any_of', field: 'tags', values: ['techno', 'live'] }, subject)).toBe(true)
    expect(evaluate_filter({ type: 'range', field: 'duration_seconds', gte: 300, lt: 301 }, subject)).toBe(true)
    expect(evaluate_filter({ type: 'range', field: 'artist', gte: 0 }, subject)).toBe(false)
  })

  test('and, or, not, and fail closed on anything unknown, even under not', () => {
    expect(evaluate_filter({ type: 'and', filters: [{ type: 'match', fields: { tags: 'house' } }, { type: 'not', filter: { type: 'match', fields: { tags: 'techno' } } }] }, subject)).toBe(true)
    expect(evaluate_filter({ type: 'or', filters: [{ type: 'match', fields: { tags: 'techno' } }, { type: 'match', fields: { artist: 'x' } }] }, subject)).toBe(false)
    expect(evaluate_filter({ type: 'not', filter: { type: 'regex', pattern: 'x' } }, subject)).toBe(false)
    expect(evaluate_filter({ type: 'match', fields: { tags: 'house' }, modifier: 'i' }, subject)).toBe(false)
  })
})

describe('storage estimate', () => {
  const library_address = '/record/z/linked'
  const sample = [
    track({ audio_size_bytes: 10_000_000, tags: [{ library_address, tag: 'keep' }] }),
    track({ audio_size_bytes: 30_000_000, tags: [{ library_address: '/record/z/other', tag: 'keep' }] })
  ]

  test('builds the track view from the library\'s own tags only', () => {
    expect(track_view(sample[1] as Track, library_address).tags).toEqual([])
    expect(track_view(sample[0] as Track, library_address)).toMatchObject({ library_address, tags: ['keep'], cid: 'bAudio', audio_size_bytes: 10_000_000 })
  })

  test('scales the sample to the whole library: all for full, the matching share for selective, none for index_only', () => {
    expect(estimate_storage({ mode: 'full', filter: null, sample, track_count: 100, library_address })).toEqual({ bytes: 2_000_000_000, sampled: 2, matched: 2 })
    expect(estimate_storage({ mode: 'selective', filter: { type: 'match', fields: { tags: 'keep' } }, sample, track_count: 100, library_address }))
      .toEqual({ bytes: 500_000_000, sampled: 2, matched: 1 })
    expect(estimate_storage({ mode: 'index_only', filter: null, sample, track_count: 100, library_address })?.bytes).toBe(0)
    expect(estimate_storage({ mode: 'full', filter: null, sample: [], track_count: 5, library_address })).toBeNull()
    expect(format_bytes(2_000_000_000)).toBe('2.0 GB')
    expect(format_bytes(512)).toBe('512 B')
  })
})
