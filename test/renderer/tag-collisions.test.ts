// Labels that differ only in case or spacing, each group merging into its
// most-used member.

import { describe, expect, test } from 'bun:test'

import type { TagCount } from '#renderer/api/types.ts'
import { tag_collisions } from '#renderer/components/tags/tag-collisions.ts'

const count = (tag: string, n: number, managed = false): TagCount => ({ tag, count: n, managed })

describe('tag_collisions', () => {
  test('Chill 40 and chill  3 merge into Chill', () => {
    expect(tag_collisions([count('Chill', 40), count('chill ', 3), count('jazz', 1)])).toEqual([{ members: [count('Chill', 40), count('chill ', 3)] }])
  })

  test('a tie goes to the first by code point, the cased form', () => {
    expect(tag_collisions([count('chill', 2), count('Chill', 2)])[0]?.members[0]?.tag).toBe('Chill')
  })

  test('AC/DC alone and a lone lowercase label yield nothing', () => {
    expect(tag_collisions([count('AC/DC', 3)])).toEqual([])
    expect(tag_collisions([count('chill', 3)])).toEqual([])
  })

  test('a managed Chill beside a hand chill yields nothing', () => {
    expect(tag_collisions([count('Chill', 40, true), count('chill', 3)])).toEqual([])
  })
})
