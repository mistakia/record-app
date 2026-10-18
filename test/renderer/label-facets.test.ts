import { describe, expect, test } from 'bun:test'

import { group_facets, label_facet, label_filter_args, label_value } from '#renderer/store/label-facets.ts'
import { track_page_args } from '#renderer/store/api.ts'

describe('label facets', () => {
  test('a prefix names the facet; a label without one is a hand label', () => {
    expect(label_facet('collection-tier/personal')).toBe('collection-tier')
    expect(label_facet('playlist/a/b')).toBe('playlist')
    expect(label_facet('house')).toBeNull()
    expect(label_facet('/odd')).toBeNull()
    expect(label_facet('AC/DC')).toBeNull()
    expect(label_facet('empty/')).toBeNull()
    expect(label_value('playlist/a/b')).toBe('a/b')
    expect(label_value('house')).toBe('house')
  })

  test('groups exporter facets first, other prefixes A to Z, hand labels last', () => {
    const facets = group_facets([
      { tag: 'house', count: 3 },
      { tag: 'zeta/x', count: 1 },
      { tag: 'collection-tier/personal-pick', count: 5 },
      { tag: 'alpha/y', count: 2 },
      { tag: 'collection-tier/personal', count: 9 },
      { tag: 'view/warmup', count: 4 },
      { tag: 'file-origin/vinyl', count: 6 }
    ])
    expect(facets.map(({ facet }) => facet)).toEqual(['collection-tier', 'view', 'file-origin', 'alpha', 'zeta', null])
    expect(facets[0]?.labels.map(({ tag }) => tag)).toEqual(['collection-tier/personal', 'collection-tier/personal-pick'])
  })

  test('selected labels become any-of groups per facet, and each hand label its own', () => {
    expect(label_filter_args([])).toEqual({})
    expect(label_filter_args(['techno', 'house'])).toEqual({ tags: ['house', 'techno'] })
    expect(label_filter_args(['collection-tier/personal-pick', 'house', 'file-origin/vinyl', 'collection-tier/personal']))
      .toEqual({ tags: ['house'], tag_groups: JSON.stringify([['collection-tier/personal', 'collection-tier/personal-pick'], ['file-origin/vinyl']]) })
  })

  test('equal selections in any order share one cache entry', () => {
    const page = (tags: string[]) => track_page_args({ library_address: '/a', page: 0, filters: { query: '', tags, sort: 'added_at', order: 'desc' } })
    expect(page(['collection-tier/b', 'house', 'collection-tier/a'])).toEqual(page(['collection-tier/a', 'collection-tier/b', 'house']))
  })
})
