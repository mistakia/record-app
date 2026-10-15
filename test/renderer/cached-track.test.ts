import { describe, expect, test } from 'bun:test'

import type { Track } from '#renderer/api/types.ts'
import { select_fresh_entries } from '#renderer/hooks/use-player.ts'
import type { QueueEntry } from '#renderer/player/queue-manager.ts'
import { freshest_cached_track } from '#renderer/store/cached-track.ts'
import type { RootState } from '#renderer/store/index.ts'

const OWN = '/record/own'
const OTHER = '/record/other'

const track = (tags: Array<{ tag: string, library_address: string }>): Track => ({
  id: 't1', library_addresses: [OWN, OTHER], content_cid: 'c1', audio_cid: 'a1', audio_size_bytes: 1, tags, have_track: true
} as unknown as Track)

const page = (library_addresses: string[] | undefined, at: number, items: Track[]) => ({
  endpointName: 'get_tracks',
  status: 'fulfilled',
  originalArgs: { offset: 0, limit: 200, ...(library_addresses === undefined ? {} : { library_addresses }) },
  fulfilledTimeStamp: at,
  data: { items, total: items.length }
})

const queries = (pages: Array<ReturnType<typeof page>>) =>
  Object.fromEntries(pages.map((entry, index) => [`get_tracks(${index})`, entry])) as unknown as Parameters<typeof freshest_cached_track>[0]['queries']

const every = track([{ tag: 'own-tag', library_address: OWN }, { tag: 'other-tag', library_address: OTHER }])
const own_only = track([{ tag: 'own-tag', library_address: OWN }])
const own_newer = track([{ tag: 'own-tag', library_address: OWN }, { tag: 'added', library_address: OWN }])

describe('freshest_cached_track', () => {
  test('a newer page of another view never stands in for the queued view', () => {
    const cached = queries([page(undefined, 1, [every]), page([OWN], 2, [own_only])])
    expect(freshest_cached_track({ queries: cached, track_id: 't1', scope: '' })).toBe(every)
    expect(freshest_cached_track({ queries: cached, track_id: 't1', scope: OWN })).toBe(own_only)
  })

  test('the newest page of the queued view wins', () => {
    const cached = queries([page([OWN], 3, [own_newer]), page([OWN], 2, [own_only])])
    expect(freshest_cached_track({ queries: cached, track_id: 't1', scope: OWN })).toBe(own_newer)
  })

  test('no page of the view holds it: null, so the entry keeps what it was queued with', () => {
    const cached = queries([page([OWN], 2, [own_only])])
    expect(freshest_cached_track({ queries: cached, track_id: 't1', scope: '' })).toBeNull()
    expect(freshest_cached_track({ queries: cached, track_id: 'missing', scope: OWN })).toBeNull()
    expect(freshest_cached_track({ queries: cached, track_id: 't1', scope: OTHER })).toBeNull()
  })
})

describe('select_fresh_entries', () => {
  const queued = { audio_cid: 'a1', library_address: OWN, content_cid: 'c1', title: 'queued title', artist: null, tags: ['own-tag'], have_track: true }
  const entry = (queue_id: string, track_id: string, scope: string) => ({ ...queued, queue_id, track_id, scope }) as unknown as QueueEntry
  const state = (cached: ReturnType<typeof queries>, entries: QueueEntry[]) =>
    ({ node_api: { queries: cached }, player: { queue: { entries, index: 0 } } }) as unknown as RootState

  test('every queued entry, not only the playing one, shows its track as the newest page describes it', () => {
    const entries = [entry('q1', 't1', OWN), entry('q2', 't1', OWN), entry('q3', 'missing', OWN)]
    const fresh = select_fresh_entries(state(queries([page([OWN], 2, [{ ...own_newer, title: 'edited' } as Track])]), entries))
    expect(fresh.map(({ title }) => title)).toEqual(['edited', 'edited', 'queued title'])
    expect(fresh[1]?.tags).toEqual(['own-tag', 'added'])
    expect(fresh[2]).toBe(entries[2])
  })

  test('a new cache state with the same track keeps each merged entry, so rows skip a re-render', () => {
    const entries = [entry('q1', 't1', OWN)]
    const cached = queries([page([OWN], 2, [own_newer])])
    const first = select_fresh_entries(state(cached, entries))
    const second = select_fresh_entries(state({ ...cached }, entries))
    expect(second).not.toBe(first)
    expect(second[0]).toBe(first[0])
  })
})
