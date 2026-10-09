import { describe, expect, test } from 'bun:test'

import { normalize_tag, suggest_tags } from '#renderer/components/track/tag-suggest.ts'

const tags = [
  { tag: 'deep house', count: 3 },
  { tag: 'house', count: 9 },
  { tag: 'hard techno', count: 2 },
  { tag: 'housey', count: 1 },
  { tag: 'techno', count: 12 },
  { tag: 'ambient', count: 4 }
]

describe('tag suggestions', () => {
  test('rank a prefix, then a word start, then a substring, then the letters in order; more used first within a rank', () => {
    expect(suggest_tags({ query: 'hou', tags })).toEqual(['house', 'housey', 'deep house'])
    expect(suggest_tags({ query: 'te', tags })).toEqual(['techno', 'hard techno'])
    expect(suggest_tags({ query: 'bnt', tags })).toEqual(['ambient'])
    expect(suggest_tags({ query: 'hno', tags })).toEqual(['techno', 'hard techno'])
  })

  test('leave out the exact tag typed, tags already on the track, and nothing for an empty query', () => {
    expect(suggest_tags({ query: 'house', tags })).toEqual(['housey', 'deep house'])
    expect(suggest_tags({ query: 'hou', tags, exclude: ['house'] })).toEqual(['housey', 'deep house'])
    expect(suggest_tags({ query: '  ', tags })).toEqual([])
    expect(suggest_tags({ query: 'h', tags, limit: 2 })).toEqual(['house', 'hard techno'])
  })

  test('typed tags are lowercase with single spaces', () => {
    expect(normalize_tag('  Deep   House ')).toBe('deep house')
  })
})
