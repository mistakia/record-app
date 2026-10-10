import { describe, expect, test } from 'bun:test'

import type { Track } from '#renderer/api/types.ts'
import { freshest_cached_track } from '#renderer/store/cached-track.ts'

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
