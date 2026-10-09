import { describe, expect, test } from 'bun:test'

import { key_handle, key_pattern } from '#renderer/identity/default-name.ts'

const KEY = `02${'a1'.repeat(32)}`

describe('the default name read from a public key', () => {
  test('is two words, the same for the same key', () => {
    expect(key_handle(KEY)).toMatch(/^[a-z]+ [a-z]+$/)
    expect(key_handle(KEY)).toBe(key_handle(KEY))
    expect(key_handle(`03${'07'.repeat(32)}`)).not.toBe(key_handle(KEY))
  })

  test('the pattern is 5 by 5 and mirrored', () => {
    const cells = key_pattern(`02${'0102030405060708090a0b0c0d0e0f10'.repeat(2)}`)
    expect(cells).toHaveLength(25)
    for (let row = 0; row < 5; row++) {
      expect(cells[row * 5]).toBe(cells[row * 5 + 4])
      expect(cells[row * 5 + 1]).toBe(cells[row * 5 + 3])
    }
  })
})
