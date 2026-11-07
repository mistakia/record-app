// The Tags page's relabel plan: a label mapping checked as the node reads
// it, kept per library to what its right covers, chunked into collection
// queries, and turned into batches the node accepts.

import { describe, expect, test } from 'bun:test'

import type { Capability, Track } from '#renderer/api/types.ts'
import type { WriteTarget } from '#renderer/library/write-targets.ts'
import { BATCH_LIMITS, collected_track, relabel_batches } from '#renderer/store/relabel-batches.ts'
import { checked_mappings, collection_queries, COLLECTION_LIMITS, covered_mappings, prefix_mappings, type LabelMapping } from '#renderer/store/relabel-plan.ts'

const LABELS = '/record/z/labels'
const SHARED = '/record/z/shared'
const OTHER = '/record/z/other'

const own: WriteTarget = { library_address: LABELS, category: 'own', capability_id: null }
const shared: WriteTarget = { library_address: SHARED, category: 'shared', capability_id: 'mix' }

const track_id = (n: number): string => n.toString(16).padStart(64, '0')

const track = (n: number, tags: Array<[string, string]>): Track => ({
  id: track_id(n),
  library_addresses: [],
  content_cid: 'c',
  audio_cid: 'a',
  audio_size_bytes: 0,
  tags: tags.map(([library_address, tag]) => ({ library_address, tag })),
  listen_count: 0,
  have_track: false
})

// The batches for tracks as GET /tracks returns them, collected for the target.
const batches_for = (input: Omit<Parameters<typeof relabel_batches>[0], 'tracks'> & { tracks: Track[] }) =>
  relabel_batches({ ...input, tracks: input.tracks.map((each) => collected_track(each, input.target.library_address)) })

const mix_capability: Capability = {
  capability_id: 'mix',
  library_address: SHARED,
  issuer: '02aa',
  grantee: { type: 'key', key: '02bb' } as unknown as Capability['grantee'],
  actions: ['library.write_label'],
  filter: { type: 'prefix', field: 'label', prefix: 'mix/' } as unknown as Capability['filter'],
  conditions: [],
  issued_at_ms: 0,
  status: 'active'
}

const check = (mappings: LabelMapping[], managed: string[] = []) => checked_mappings({ mappings, managed: new Set(managed) })

describe('checked_mappings', () => {
  test('refuses a chain: a target that is also a source', () => {
    const { mappings, refused } = check([{ from_label: 'a', to_label: 'b' }, { from_label: 'b', to_label: 'c' }])
    expect(mappings).toEqual([{ from_label: 'b', to_label: 'c' }])
    expect(refused).toEqual([{ mapping: { from_label: 'a', to_label: 'b' }, reason: 'chain' }])
  })

  test('refuses a target over 128 UTF-8 bytes, and takes one of exactly 128', () => {
    expect(check([{ from_label: 'a', to_label: 'x'.repeat(129) }]).refused[0]?.reason).toBe('target_too_long')
    expect(check([{ from_label: 'a', to_label: 'é'.repeat(65) }]).refused[0]?.reason).toBe('target_too_long')
    expect(check([{ from_label: 'a', to_label: 'é'.repeat(64) }]).refused).toEqual([])
  })

  test('refuses an empty target and a control character', () => {
    expect(check([{ from_label: 'a', to_label: '' }]).refused[0]?.reason).toBe('empty_target')
    expect(check([{ from_label: 'a', to_label: 'b\u0007' }]).refused[0]?.reason).toBe('control_character')
  })

  test('refuses managed sources and managed targets', () => {
    const { mappings, refused } = check([{ from_label: 'view/x', to_label: 'y' }, { from_label: 'z', to_label: 'view/x' }], ['view/x'])
    expect(mappings).toEqual([])
    expect(refused.map(({ reason }) => reason)).toEqual(['managed_source', 'managed_target'])
  })

  test('drops empty sources and identity pairs, and takes a delete', () => {
    expect(check([{ from_label: '', to_label: 'a' }, { from_label: 'b', to_label: 'b' }, { from_label: 'c', to_label: null }]))
      .toEqual({ mappings: [{ from_label: 'c', to_label: null }], refused: [] })
  })

  test('normalises a decomposed source to NFC', () => {
    const { mappings } = check([{ from_label: 'cafe\u0301', to_label: 'coffee' }])
    expect(mappings).toEqual([{ from_label: 'caf\u00e9', to_label: 'coffee' }])
  })

  test('counts a repeated source once and refuses one with another target', () => {
    const { mappings, refused } = check([{ from_label: 'a', to_label: 'b' }, { from_label: 'a', to_label: 'b' }, { from_label: 'a', to_label: 'c' }])
    expect(mappings).toEqual([{ from_label: 'a', to_label: 'b' }])
    expect(refused).toEqual([{ mapping: { from_label: 'a', to_label: 'c' }, reason: 'conflicting_targets' }])
  })
})

describe('prefix_mappings', () => {
  test('moves every label under a facet, and only those', () => {
    expect(prefix_mappings({ labels: ['mix/a', 'mix/b', 'mixed', 'AC/DC'], from_prefix: 'mix', to_prefix: 'playlist' }))
      .toEqual([{ from_label: 'mix/a', to_label: 'playlist/a' }, { from_label: 'mix/b', to_label: 'playlist/b' }])
    expect(prefix_mappings({ labels: ['mix/a'], from_prefix: 'mix', to_prefix: '' })).toEqual([{ from_label: 'mix/a', to_label: 'a' }])
  })
})

describe('covered_mappings', () => {
  test('an own library covers every mapping', () => {
    const mappings = [{ from_label: 'mix/c', to_label: 'chill' }]
    expect(covered_mappings({ target: own, held: [], mappings })).toEqual({ covered: mappings, uncovered: [] })
  })

  test('a mix/ capability keeps mix/a to mix/b and names mix/c to chill', () => {
    const { covered, uncovered } = covered_mappings({
      target: shared,
      held: [mix_capability],
      mappings: [{ from_label: 'mix/a', to_label: 'mix/b' }, { from_label: 'mix/c', to_label: 'chill' }, { from_label: 'mix/d', to_label: null }]
    })
    expect(covered).toEqual([{ from_label: 'mix/a', to_label: 'mix/b' }, { from_label: 'mix/d', to_label: null }])
    expect(uncovered).toEqual([{ from_label: 'mix/c', to_label: 'chill' }])
  })
})

describe('collection_queries', () => {
  test('a 300-label facet splits into several queries whose union is every source', () => {
    const mappings = prefix_mappings({ labels: Array.from({ length: 300 }, (_, n) => `playlist/${'long-name-'.repeat(4)}${n}`), from_prefix: 'playlist', to_prefix: 'mix' })
    const queries = collection_queries({ label_libraries: [LABELS], mappings })
    expect(queries.length).toBeGreaterThan(1)
    const groups = queries.map(({ tag_groups }) => JSON.parse(tag_groups) as string[][])
    for (const group of groups) {
      expect(group.length).toBe(1)
      expect(group[0]!.length).toBeLessThanOrEqual(COLLECTION_LIMITS.labels)
    }
    for (const { tag_groups, label_libraries } of queries) {
      expect(label_libraries).toEqual([LABELS])
      expect(new URLSearchParams({ tag_groups }).toString().length).toBeLessThanOrEqual(COLLECTION_LIMITS.query_bytes + 'tag_groups='.length)
    }
    expect(groups.flatMap((group) => group[0]!).sort()).toEqual(mappings.map(({ from_label }) => from_label).sort())
  })

  test('caps a group at 256 labels however short', () => {
    const mappings = Array.from({ length: 300 }, (_, n) => ({ from_label: `${n}`, to_label: null }))
    expect(collection_queries({ label_libraries: [LABELS], mappings }).map(({ tag_groups }) => (JSON.parse(tag_groups) as string[][])[0]!.length)).toEqual([256, 44])
  })
})

describe('relabel_batches', () => {
  test('a merge where one track holds both sources is one item', () => {
    const { batches } = batches_for({
      target: own,
      held: [],
      mappings: [{ from_label: 'Chill', to_label: 'chill' }, { from_label: 'chill ', to_label: 'chill' }],
      tracks: [track(1, [[LABELS, 'Chill'], [LABELS, 'chill '], [LABELS, 'other']]), track(2, [[LABELS, 'jazz']])]
    })
    expect(batches).toEqual([{ library_address: LABELS, capability_id: null, items: [{ track_id: track_id(1), add: ['chill'], remove: ['Chill', 'chill '] }] }])
  })

  test('a delete removes without adding', () => {
    const { batches } = batches_for({ target: own, held: [], mappings: [{ from_label: 'old', to_label: null }], tracks: [track(1, [[LABELS, 'old']])] })
    expect(batches[0]?.items).toEqual([{ track_id: track_id(1), remove: ['old'] }])
  })

  test('ignores labels another library applies to the track', () => {
    const { batches } = batches_for({ target: own, held: [], mappings: [{ from_label: 'old', to_label: 'new' }], tracks: [track(1, [[OTHER, 'old']])] })
    expect(batches).toEqual([])
  })

  test('a shared library cites the capability that admits the pair, and names a track it does not', () => {
    const { batches, refused } = batches_for({
      target: shared,
      held: [mix_capability],
      mappings: [{ from_label: 'mix/a', to_label: 'mix/b' }, { from_label: 'mix/c', to_label: 'chill' }],
      tracks: [track(1, [[SHARED, 'mix/a'], [SHARED, 'mix/c']])]
    })
    expect(batches).toEqual([{ library_address: SHARED, capability_id: 'mix', items: [{ track_id: track_id(1), add: ['mix/b'], remove: ['mix/a'] }] }])
    expect(refused).toEqual([{ track_id: track_id(1), from_label: 'mix/c' }])
  })

  test('200 items of 40 long labels split under 64 KiB and 1,000 pairs, every pair kept', () => {
    const sources = Array.from({ length: 40 }, (_, n) => `${'x'.repeat(120)}${n.toString().padStart(3, '0')}`)
    const mappings = sources.map((from_label) => ({ from_label, to_label: `y${from_label}`.slice(0, 128) }))
    const tracks = Array.from({ length: 200 }, (_, n) => track(n, sources.map((tag) => [LABELS, tag])))
    const { batches } = batches_for({ target: own, held: [], mappings, tracks })
    expect(batches.length).toBeGreaterThan(1)
    let removed = 0
    for (const batch of batches) {
      const body = JSON.stringify({ items: batch.items, library_address: batch.library_address })
      expect(new TextEncoder().encode(body).length).toBeLessThanOrEqual(BATCH_LIMITS.body_bytes)
      expect(batch.items.length).toBeLessThanOrEqual(BATCH_LIMITS.items)
      expect(batch.items.reduce((sum, { add = [], remove = [] }) => sum + add.length + remove.length, 0)).toBeLessThanOrEqual(BATCH_LIMITS.pairs)
      expect(new Set(batch.items.map(({ track_id }) => track_id)).size).toBe(batch.items.length)
      removed += batch.items.reduce((sum, { remove = [] }) => sum + remove.length, 0)
    }
    expect(removed).toBe(200 * 40)
  })

  test('splits one track whose item alone exceeds the limits, never twice in a batch', () => {
    const sources = Array.from({ length: 1200 }, (_, n) => `s${n}`)
    const { batches } = batches_for({
      target: own,
      held: [],
      mappings: sources.map((from_label) => ({ from_label, to_label: 'merged' })),
      tracks: [track(1, sources.map((tag) => [LABELS, tag]))]
    })
    expect(batches.length).toBe(2)
    expect(batches.flatMap(({ items }) => items.flatMap(({ remove = [] }) => remove)).length).toBe(1200)
    for (const { items } of batches) expect(items.length).toBe(1)
  })
})
