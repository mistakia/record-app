// FilterSpec (spec §3.5.7) and capability descriptions (§8.6.4): the editor's
// structural checks, and opaque labels for everything this version does not
// define.

import { describe, expect, test } from 'bun:test'

import { blank_draft, can_draft, from_draft, to_draft } from '#renderer/filter/filter-draft.ts'
import { CAPABILITY_FIELDS, describe_filter, filter_problems, FILTER_TYPES, REPLICATION_FIELDS, type FilterSpec } from '#renderer/filter/filter-spec.ts'
import { describe_action, describe_conditions, describe_grantee, describe_scope, parse_grantee_keys } from '#renderer/library/capabilities.ts'

const KEY = `02${'ab'.repeat(32)}`

describe('filter problems', () => {
  test('a blank draft of every type converts to a sound filter', () => {
    for (const type of FILTER_TYPES) {
      const result = from_draft(blank_draft(type), CAPABILITY_FIELDS)
      expect(result.ok && filter_problems(result.spec)).toEqual([])
    }
  })

  test('catches what the node would refuse or what would match nothing', () => {
    const cases: unknown[] = [
      { type: 'regex', field: 'title', pattern: 'x' },
      { type: 'match', fields: {} },
      { type: 'match', fields: { tags: { nested: true } } },
      { type: 'match', fields: { tags: 'a' }, extra: 1 },
      { type: 'any_of', field: 'tags', values: [] },
      { type: 'range', field: 'duration_seconds' },
      { type: 'range', field: 'duration_seconds', gte: 'ten' },
      { type: 'and', filters: [] },
      { type: 'not', filter: { type: 'unknown' } },
      { type: 'match', fields: { '': 'a' } }
    ]
    for (const spec of cases) expect(filter_problems(spec).length).toBeGreaterThan(0)
    let deep: unknown = { type: 'match', fields: { tags: 'a' } }
    for (let level = 0; level < 15; level++) deep = { type: 'not', filter: deep }
    // Sixteen levels pass; seventeen do not.
    expect(filter_problems(deep)).toEqual([])
    expect(filter_problems({ type: 'not', filter: deep }).some((problem) => problem.includes('nested more than 16'))).toBe(true)
  })
})

describe('filter drafts', () => {
  test('keep typed text, and read as a filter only when every part does', () => {
    const draft = blank_draft('and', 'tags')
    if (draft.type !== 'and') throw new Error('expected and')
    const rows = { type: 'match' as const, rows: [{ path: 'artist', text: 'Daft Punk, Live' }, { path: 'duration_seconds', text: '1.' }] }
    expect(from_draft({ ...draft, children: [rows] }, REPLICATION_FIELDS)).toEqual({
      ok: true,
      spec: { type: 'and', filters: [{ type: 'match', fields: { artist: 'Daft Punk, Live', duration_seconds: 1 } }] }
    })
    expect(from_draft({ type: 'match', rows: [{ path: 'tags', text: 'a' }, { path: 'tags', text: 'b' }] }, CAPABILITY_FIELDS)).toEqual({ ok: false, reason: 'The field tags is listed twice.' })
    expect(from_draft({ type: 'match', rows: [{ path: '', text: 'a' }] }, CAPABILITY_FIELDS).ok).toBe(false)
    expect(from_draft({ type: 'range', field: 'added_at', bounds: { gte: '-', gt: '', lte: '', lt: '' } }, REPLICATION_FIELDS).ok).toBe(false)
    expect(from_draft({ type: 'range', field: 'added_at', bounds: { gte: '-2.5', gt: '', lte: '', lt: '' } }, REPLICATION_FIELDS)).toEqual({ ok: true, spec: { type: 'range', field: 'added_at', gte: -2.5 } })
  })

  test('only filters that survive a round trip open in the structured editor', () => {
    expect(can_draft({ type: 'match', fields: { tags: 'house' } }, CAPABILITY_FIELDS)).toBe(true)
    for (const spec of [
      { type: 'match', fields: { id: null } },
      { type: 'match', fields: { tags: true } },
      { type: 'match', fields: { tags: 5 } },
      { type: 'match', fields: { timestamp: '5' } },
      { type: 'match', fields: { ' id': 'x' } },
      { type: 'regex', pattern: 'x' }
    ]) expect(can_draft(spec, CAPABILITY_FIELDS)).toBe(false)
    expect(from_draft({ type: 'range', field: 'timestamp', bounds: { gte: '0x10', gt: '', lte: '', lt: '' } }, CAPABILITY_FIELDS).ok).toBe(false)
    expect(describe_grantee({ type: 'key_set', keys: [] })).toBe('(malformed key_set grantee)')
  })

  test('round-trip a sound filter', () => {
    const spec: FilterSpec = { type: 'or', filters: [{ type: 'any_of', field: 'tags', values: ['a', 'b c'] }, { type: 'not', filter: { type: 'range', field: 'timestamp', lt: 5 } }] }
    expect(from_draft(to_draft(spec), CAPABILITY_FIELDS)).toEqual({ ok: true, spec })
  })
})

describe('descriptions', () => {
  test('describes known filters in words and unknown ones as opaque labels', () => {
    expect(describe_filter({ type: 'and', filters: [{ type: 'match', fields: { tags: 'house' } }, { type: 'range', field: 'duration_seconds', lt: 600 }] }))
      .toBe('(tags is "house" and duration_seconds under 600)')
    expect(describe_filter({ type: 'not', filter: { type: 'regex', pattern: '.*' } })).toBe('not (unknown filter: regex)')
    expect(describe_filter({ type: 'match', fields: { tags: 'a' }, modifier: 'i' })).toBe('tags is "a" (unknown fields: modifier)')
  })

  test('labels unknown verbs, grantee types, and conditions without hiding them', () => {
    expect(describe_action('library.append_track')).toBe('Add tracks')
    expect(describe_action('library.append_listen')).toBe('(unknown action: library.append_listen)')
    expect(describe_grantee({ type: 'key', key: KEY })).toContain('02ababab')
    expect(describe_grantee({ type: 'key_set', keys: [KEY, KEY] })).toContain('2 identities')
    expect(describe_grantee({ type: 'group', id: 'x' })).toBe('(unknown grantee: group)')
    expect(describe_conditions([{ type: 'max_uses', n: 3 }])).toEqual(['(unknown condition: max_uses)'])
    // A known type carrying a field it does not define fails closed (§3.5.5).
    expect(describe_grantee({ type: 'key', key: KEY, scope: 'x' })).toContain('(unknown fields: scope)')
    expect(describe_conditions([{ type: 'expires_at', at: 5, tz: 'utc' }])[0]).toContain('(unknown fields: tz)')
    expect(describe_conditions([{ type: 'expires_at', at: 'soon' }])).toEqual(['(malformed expires_at)'])
    expect(describe_scope({ actions: ['library.append_tag', 'x.y'], filter: { type: 'match', fields: { tags: 'a' } }, conditions: [] }))
      .toBe('Add tags, (unknown action: x.y); only tags is "a"')
  })

  test('parses grantee keys into a key or a key set, refusing anything else', () => {
    expect(parse_grantee_keys(KEY)).toEqual({ ok: true, grantee: { type: 'key', key: KEY } })
    const other = `03${'cd'.repeat(32)}`
    expect(parse_grantee_keys(`${KEY}\n${other}, ${KEY}`)).toEqual({ ok: true, grantee: { type: 'key_set', keys: [KEY, other] } })
    expect(parse_grantee_keys('').ok).toBe(false)
    expect(parse_grantee_keys(`04${'ab'.repeat(32)}`).ok).toBe(false)
  })
})
