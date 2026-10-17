import { describe, expect, test } from 'bun:test'

import { fit_column_width, grid_min_width, grid_template, NO_HIDDEN_COLUMNS, visible_columns } from '#renderer/components/track/columns.ts'

const ALL = visible_columns(NO_HIDDEN_COLUMNS)

describe('track list columns', () => {
  test('the default grid holds every column at its default', () => {
    expect(grid_template(ALL)).toBe('4ch 2ch minmax(120px, 1.6fr) minmax(80px, 1fr) minmax(80px, 1fr) 6ch minmax(100px, 1.4fr) 6ch 6ch 5ch 8ch 3ch')
  })

  test('a resized column holds its pixels, the defaults give way', () => {
    expect(grid_template(ALL, { artist: 180 })).toBe('4ch 2ch minmax(120px, 1.6fr) 180px minmax(80px, 1fr) 6ch minmax(100px, 1.4fr) 6ch 6ch 5ch 8ch 3ch')
    expect(grid_template(ALL, { title: 300, time: 70 })).toBe('4ch 2ch 300px minmax(80px, 1fr) minmax(80px, 1fr) 6ch minmax(100px, 1.4fr) 6ch 70px 5ch 8ch 3ch')
  })

  test('a width of a column the list has hidden is simply absent', () => {
    const visible = visible_columns(['artist'])
    expect(grid_template(visible, { artist: 180, album: 120 })).toBe('4ch 2ch minmax(120px, 1.6fr) 120px 6ch minmax(100px, 1.4fr) 6ch 6ch 5ch 8ch 3ch')
  })

  test('a resized pixel width is that column\'s minimum for sideways scrolling', () => {
    expect(grid_min_width(ALL, { artist: 180 })).toBe('calc(4ch + 2ch + 120px + 180px + 80px + 6ch + 100px + 6ch + 6ch + 5ch + 8ch + 3ch + 11 * var(--space-sm) + var(--space-sm) + var(--space-lg))')
  })
})

describe('fit_column_width', () => {
  test('the widest content, rounded up with a hair of room', () => {
    expect(fit_column_width({ contents: [90.2, 140.4, 60], min: 48, max: 720 })).toBe(143)
  })

  test('held to the resize bounds', () => {
    expect(fit_column_width({ contents: [10], min: 48, max: 720 })).toBe(48)
    expect(fit_column_width({ contents: [2000], min: 48, max: 720 })).toBe(720)
    expect(fit_column_width({ contents: [], min: 48, max: 720 })).toBe(48)
  })
})
