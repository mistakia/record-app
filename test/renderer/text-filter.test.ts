import { describe, expect, test } from 'bun:test'

import { matches_filter } from '#renderer/components/common/text-filter.ts'

describe('matches_filter', () => {
  test('every word somewhere, in any order, ignoring case', () => {
    expect(matches_filter('origin/family-3', 'fam')).toBe(true)
    expect(matches_filter('origin/family-3', '3 ORIGIN')).toBe(true)
    expect(matches_filter('origin/family-3', 'fam tier')).toBe(false)
  })

  test('an empty query matches all', () => {
    expect(matches_filter('house', '  ')).toBe(true)
  })
})
