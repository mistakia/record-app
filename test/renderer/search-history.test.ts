import { describe, expect, test } from 'bun:test'

import { recent_search_key } from '#renderer/components/track/recent-searches.ts'
import { clear_searches, record_search, remove_search, SEARCH_HISTORY_LIMIT, with_search_recorded, with_search_removed } from '#renderer/prefs/search-history.ts'
import { read_view_pref } from '#renderer/prefs/view-prefs.ts'

const stored = () => read_view_pref<readonly string[]>('search-history', [])

describe('search history', () => {
  test('records trimmed text newest first, and never blank text', () => {
    expect(with_search_recorded(['house'], '  techno ')).toEqual(['techno', 'house'])
    const history = ['house']
    expect(with_search_recorded(history, '   ')).toBe(history)
  })

  test('a repeat, in any case, moves to the top as last typed', () => {
    expect(with_search_recorded(['house', 'Techno', 'dub'], 'techno')).toEqual(['techno', 'house', 'dub'])
  })

  test('keeps the newest 20', () => {
    let history: readonly string[] = []
    for (let index = 0; index < 25; index++) history = with_search_recorded(history, `query ${index}`)
    expect(history).toHaveLength(SEARCH_HISTORY_LIMIT)
    expect(history[0]).toBe('query 24')
    expect(history.at(-1)).toBe('query 5')
  })

  test('removes one entry', () => {
    expect(with_search_removed(['techno', 'house'], 'techno')).toEqual(['house'])
  })

  test('the stored list records, removes, and clears', () => {
    clear_searches()
    record_search('house')
    record_search('techno')
    record_search('HOUSE')
    expect(stored()).toEqual(['HOUSE', 'techno'])
    remove_search('techno')
    expect(stored()).toEqual(['HOUSE'])
    clear_searches()
    expect(stored()).toEqual([])
  })
})

describe('recent search keys', () => {
  test('arrows move the highlight within the list; up past the first row returns to the field', () => {
    expect(recent_search_key({ key: 'ArrowDown', highlighted: -1, count: 3 })).toEqual({ kind: 'highlight', index: 0 })
    expect(recent_search_key({ key: 'ArrowDown', highlighted: 2, count: 3 })).toEqual({ kind: 'highlight', index: 2 })
    expect(recent_search_key({ key: 'ArrowUp', highlighted: 0, count: 3 })).toEqual({ kind: 'highlight', index: -1 })
    expect(recent_search_key({ key: 'ArrowUp', highlighted: -1, count: 3 })).toEqual({ kind: 'highlight', index: -1 })
  })

  test('Enter runs the highlighted search, and is the field\'s own with none', () => {
    expect(recent_search_key({ key: 'Enter', highlighted: 1, count: 3 })).toEqual({ kind: 'run', index: 1 })
    expect(recent_search_key({ key: 'Enter', highlighted: -1, count: 3 })).toBeNull()
  })

  test('Esc closes the list; other keys and an empty list pass to the field', () => {
    expect(recent_search_key({ key: 'Escape', highlighted: 0, count: 3 })).toEqual({ kind: 'close' })
    expect(recent_search_key({ key: 'a', highlighted: 0, count: 3 })).toBeNull()
    expect(recent_search_key({ key: 'ArrowDown', highlighted: -1, count: 0 })).toBeNull()
  })
})
