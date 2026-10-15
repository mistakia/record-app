import { describe, expect, test } from 'bun:test'

import { group_facets, label_facet, label_filter_args, label_value } from '#renderer/store/label-facets.ts'
import { track_page_args } from '#renderer/store/api.ts'

describe('label facets', () => {
  test('a prefix names the facet; a label without one is a hand label', () => {
    expect(label_facet('tier/personal')).toBe('tier')
    expect(label_facet('playlist/a/b')).toBe('playlist')
    expect(label_facet('house')).toBeNull()
    expect(label_facet('/odd')).toBeNull()
    expect(label_value('playlist/a/b')).toBe('a/b')
    expect(label_value('house')).toBe('house')
  })

  test('groups exporter facets first, other prefixes A to Z, hand labels last', () => {
    const facets = group_facets([
      { tag: 'house', count: 3 },
      { tag: 'zeta/x', count: 1 },
      { tag: 'tier/personal-picks', count: 5 },
      { tag: 'alpha/y', count: 2 },
      { tag: 'tier/personal', count: 9 },
      { tag: 'view/warmup', count: 4 },
      { tag: 'origin/vinyl', count: 6 }
    ])
    expect(facets.map(({ facet }) => facet)).toEqual(['tier', 'origin', 'view', 'alpha', 'zeta', null])
    expect(facets[0]?.labels.map(({ tag }) => tag)).toEqual(['tier/personal', 'tier/personal-picks'])
  })

  test('selected labels become any-of groups per facet, and each hand label its own', () => {
    expect(label_filter_args([])).toEqual({})
    expect(label_filter_args(['techno', 'house'])).toEqual({ tags: ['house', 'techno'] })
    expect(label_filter_args(['tier/personal-picks', 'house', 'origin/vinyl', 'tier/personal']))
      .toEqual({ tags: ['house'], tag_groups: JSON.stringify([['origin/vinyl'], ['tier/personal', 'tier/personal-picks']]) })
  })

  test('equal selections in any order share one cache entry', () => {
    const page = (tags: string[]) => track_page_args({ library_address: '/a', page: 0, filters: { query: '', tags, sort: 'added_at', order: 'desc' } })
    expect(page(['tier/b', 'house', 'tier/a'])).toEqual(page(['tier/a', 'tier/b', 'house']))
  })
})
