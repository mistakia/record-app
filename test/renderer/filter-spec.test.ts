// FilterSpec (spec §3.5.7) and capability descriptions (§8.6.4): the editor's
// structural checks, and opaque labels for everything this version does not
// define.

import { describe, expect, test } from 'bun:test'

import { blank_filter, describe_filter, filter_problems, FILTER_TYPES } from '#renderer/filter/filter-spec.ts'
import { describe_action, describe_conditions, describe_grantee, describe_scope, parse_grantee_keys } from '#renderer/library/capabilities.ts'

const KEY = `02${'ab'.repeat(32)}`

describe('filter problems', () => {
  test('a blank node of every type is sound', () => {
    for (const type of FILTER_TYPES) expect(filter_problems(blank_filter(type))).toEqual([])
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
    for (let level = 0; level < 16; level++) deep = { type: 'not', filter: deep }
    expect(filter_problems(deep).some((problem) => problem.includes('nested more than 16'))).toBe(true)
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
