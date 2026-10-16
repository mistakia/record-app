import { describe, expect, test } from 'bun:test'

import { fit_count } from '#renderer/components/common/overflow-chips-logic.ts'

describe('fit_count', () => {
  test('every chip when they fit without the +N chip', () => {
    expect(fit_count({ widths: [40, 40, 40], gap: 4, available: 128, more_width: 30 })).toBe(3)
  })

  test('leaves room for the +N chip once any chip folds', () => {
    // 40 + 4 + 40 + 4 + 30 = 118 fits; a third chip would not.
    expect(fit_count({ widths: [40, 40, 40], gap: 4, available: 127, more_width: 30 })).toBe(2)
  })

  test('the first chip, to be ellipsized, when only the +N chip fits whole', () => {
    expect(fit_count({ widths: [80, 40], gap: 4, available: 100, more_width: 30 })).toBe(1)
  })

  test('none of none', () => {
    expect(fit_count({ widths: [], gap: 4, available: 0, more_width: 30 })).toBe(0)
  })
})
