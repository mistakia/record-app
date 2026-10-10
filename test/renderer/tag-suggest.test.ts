import { describe, expect, test } from 'bun:test'

import { move_highlight, normalize_tag, suggest_tags, tab_completion, type AdderRow } from '#renderer/components/track/tag-suggest.ts'

const tags = [
  { tag: 'deep house', count: 3 },
  { tag: 'house', count: 9 },
  { tag: 'hard techno', count: 2 },
  { tag: 'housey', count: 1 },
  { tag: 'techno', count: 12 },
  { tag: 'ambient', count: 4 }
]

const names = (rows: AdderRow[]): string[] => rows.map((row) => row.kind === 'create' ? `create ${row.tag}` : row.tag)

describe('tag suggestions', () => {
  test('with nothing typed, the most used tags the track lacks, up to the limit', () => {
    expect(names(suggest_tags({ query: '', tags }))).toEqual(['techno', 'house', 'ambient', 'deep house', 'hard techno', 'housey'])
    expect(names(suggest_tags({ query: '  ', tags, exclude: ['techno'], limit: 3 }))).toEqual(['house', 'ambient', 'deep house'])
    expect(suggest_tags({ query: '', tags: [{ tag: 'b', count: 2 }, { tag: 'a', count: 2 }] })).toEqual([
      { kind: 'tag', tag: 'a', count: 2, matched: [] },
      { kind: 'tag', tag: 'b', count: 2, matched: [] }
    ])
  })

  test('rank the tag itself, a prefix, a word start, a substring, then the letters in order; more used first within a rank', () => {
    expect(names(suggest_tags({ query: 'hou', tags }))).toEqual(['house', 'housey', 'deep house', 'create hou'])
    expect(names(suggest_tags({ query: 'te', tags }))).toEqual(['techno', 'hard techno', 'create te'])
    expect(names(suggest_tags({ query: 'bnt', tags }))).toEqual(['ambient', 'create bnt'])
    expect(names(suggest_tags({ query: 'house', tags }))).toEqual(['house', 'housey', 'deep house'])
    expect(names(suggest_tags({ query: 'h', tags, limit: 2 }))).toEqual(['house', 'hard techno', 'create h'])
  })

  test('each row carries the letters it matched', () => {
    const matched = (query: string, tag: string) => suggest_tags({ query, tags }).find((row) => row.tag === tag)
    expect(matched('hou', 'deep house')).toEqual({ kind: 'tag', tag: 'deep house', count: 3, matched: [5, 6, 7] })
    expect(matched('bnt', 'ambient')).toEqual({ kind: 'tag', tag: 'ambient', count: 4, matched: [2, 5, 6] })
    expect(matched('chn', 'techno')).toEqual({ kind: 'tag', tag: 'techno', count: 12, matched: [2, 3, 4] })
  })

  test('a create row only for a typed tag neither the view nor the track has', () => {
    expect(suggest_tags({ query: ' Night  Drive ', tags }).at(-1)).toEqual({ kind: 'create', tag: 'night drive' })
    expect(names(suggest_tags({ query: 'house', tags, exclude: ['house'] }))).toEqual(['housey', 'deep house'])
    expect(names(suggest_tags({ query: 'dub', tags: [], exclude: ['dub'] }))).toEqual([])
  })

  test('typed tags are lowercase with single spaces', () => {
    expect(normalize_tag('  Deep   House ')).toBe('deep house')
  })
})

describe('highlight', () => {
  test('down from the field takes the first row, up the last, and past either end returns to the field', () => {
    expect(move_highlight({ highlight: null, count: 3, step: 1 })).toBe(0)
    expect(move_highlight({ highlight: null, count: 3, step: -1 })).toBe(2)
    expect(move_highlight({ highlight: 0, count: 3, step: 1 })).toBe(1)
    expect(move_highlight({ highlight: 2, count: 3, step: 1 })).toBeNull()
    expect(move_highlight({ highlight: 0, count: 3, step: -1 })).toBeNull()
    expect(move_highlight({ highlight: null, count: 0, step: 1 })).toBeNull()
  })

  test('tab completes the highlighted row, else the first tag once something is typed', () => {
    const rows = suggest_tags({ query: 'hou', tags })
    expect(tab_completion({ rows, highlight: null, draft: 'hou' })).toBe('house')
    expect(tab_completion({ rows, highlight: 2, draft: 'hou' })).toBe('deep house')
    expect(tab_completion({ rows, highlight: 3, draft: 'hou' })).toBeNull()
    expect(tab_completion({ rows: suggest_tags({ query: '', tags }), highlight: null, draft: '' })).toBeNull()
    expect(tab_completion({ rows: suggest_tags({ query: '', tags }), highlight: 1, draft: '' })).toBe('house')
  })
})
