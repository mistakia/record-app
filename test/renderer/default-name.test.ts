import { describe, expect, test } from 'bun:test'

import { avatar_pattern } from '#renderer/components/common/avatar-pattern.ts'
import { key_handle } from '#renderer/identity/default-name.ts'

const KEY = `02${'a1'.repeat(32)}`

describe('the default name read from a public key', () => {
  test('is two words, the same for the same key', () => {
    expect(key_handle(KEY)).toMatch(/^[a-z]+ [a-z]+$/)
    expect(key_handle(KEY)).toBe(key_handle(KEY))
    expect(key_handle(`03${'07'.repeat(32)}`)).not.toBe(key_handle(KEY))
  })
})

describe('the avatar pattern read from a library address', () => {
  test('is 5 by 5, mirrored, and differs between libraries', () => {
    const cells = avatar_pattern('/record/zBwWX9ecKnSpGxS1P/mixes')
    expect(avatar_pattern('/record/zBwWX9ecKnSpGxS1P/mixes')).toEqual(cells)
    expect(avatar_pattern('/record/zBwWX9ecKnSpGxS1P/radio')).not.toEqual(cells)
    expect(cells).toHaveLength(25)
    for (let row = 0; row < 5; row++) {
      expect(cells[row * 5]).toBe(cells[row * 5 + 4])
      expect(cells[row * 5 + 1]).toBe(cells[row * 5 + 3])
    }
  })
})
