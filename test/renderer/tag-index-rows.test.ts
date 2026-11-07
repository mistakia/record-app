// The Tags page's index rows: facets over their labels, folds, the filter,
// the sort, the managed and not-writable marks, and a cursor and selection
// held by label.

import { describe, expect, test } from 'bun:test'

import type { TagCount } from '#renderer/api/types.ts'
import { facet_key, MANAGED_REFUSAL, move_cursor, relabel_request, select_range, shown_label, shown_selection, tag_index_rows, toggled, type TagIndexRow } from '#renderer/components/tags/tag-index-rows.ts'

const count = (tag: string, n: number, managed = false): TagCount => ({ tag, count: n, managed })

const COUNTS = [count('mix/b', 2), count('mix/a', 5), count('AC/DC', 3), count('chill', 9), count('view/x', 4, true)]

const ALL_OPEN = new Set([facet_key('view'), facet_key('mix'), facet_key(null)])

const rows = (overrides: Partial<Parameters<typeof tag_index_rows>[0]> = {}): TagIndexRow[] =>
  tag_index_rows({ counts: COUNTS, filter: '', sort: 'name', opened: ALL_OPEN, writable: null, ...overrides })

const keys = (list: readonly TagIndexRow[]): string[] => list.map((row) => row.kind === 'facet' ? `# ${row.facet ?? 'hand'}` : row.tag)

describe('tag_index_rows', () => {
  test('facets over their labels, hand labels last, and AC/DC stays a hand label', () => {
    expect(keys(rows())).toEqual(['# view', 'view/x', '# mix', 'mix/a', 'mix/b', '# hand', 'AC/DC', 'chill'])
  })

  test('a header totals its labels', () => {
    expect(rows().find((row) => row.kind === 'facet' && row.facet === 'mix')).toMatchObject({ label_count: 2, total: 7 })
  })

  test('every facet is folded until opened', () => {
    expect(keys(rows({ opened: new Set() }))).toEqual(['# view', '# mix', '# hand'])
    expect(keys(rows({ opened: new Set([facet_key('mix')]) }))).toEqual(['# view', '# mix', 'mix/a', 'mix/b', '# hand'])
  })

  test('a header is managed only when every label shown under it is', () => {
    const managed = rows().flatMap((row) => row.kind === 'facet' ? [[row.facet, row.managed]] : [])
    expect(managed).toEqual([['view', true], ['mix', false], [null, false]])
  })

  test('a filter showing only a mixed facet\'s managed labels leaves its header unmarked', () => {
    const mixed = [count('mix/a', 5, true), count('mix/b', 2)]
    expect(tag_index_rows({ counts: mixed, filter: 'mix/a', sort: 'name', opened: ALL_OPEN, writable: null })[0]).toMatchObject({ kind: 'facet', managed: false })
  })

  test('the filter keeps only headers of matching labels, and opens a folded one', () => {
    expect(keys(rows({ filter: 'mix a', opened: new Set() }))).toEqual(['# mix', 'mix/a'])
  })

  test('sorts by count within a facet', () => {
    expect(keys(rows({ sort: 'count' }))).toEqual(['# view', 'view/x', '# mix', 'mix/a', 'mix/b', '# hand', 'chill', 'AC/DC'])
  })

  test('marks managed labels and labels no writable library holds', () => {
    const list = rows({ writable: new Set(['chill', 'mix/a']) })
    expect(list.find((row) => row.key === 'view/x')).toMatchObject({ managed: true, not_writable: true })
    expect(list.find((row) => row.key === 'chill')).toMatchObject({ managed: false, not_writable: false })
    expect(list.find((row) => row.key === 'mix/b')).toMatchObject({ not_writable: true })
    expect(rows().every((row) => row.kind === 'facet' || !row.not_writable)).toBe(true)
  })
})

describe('cursor and selection by label', () => {
  test('a selection by label survives a re-sort', () => {
    const before = rows({ sort: 'name' })
    const selected = new Set(select_range(before, 'AC/DC', 'chill'))
    const after = tag_index_rows({ counts: [...COUNTS.filter(({ tag }) => tag !== 'AC/DC'), count('AC/DC', 20)], filter: '', sort: 'count', opened: ALL_OPEN, writable: null })
    expect(shown_selection(after, selected)).toEqual(['AC/DC', 'chill'])
    expect(move_cursor(after, 'AC/DC', 1)).toBe('chill')
  })

  test('a range skips headers, and a cursor whose label is gone lands on the first row', () => {
    const list = rows()
    expect(select_range(list, 'view/x', 'mix/a')).toEqual(['view/x', 'mix/a'])
    expect(move_cursor(list, 'gone', 1)).toBe(facet_key('view'))
    expect(move_cursor(list, 'chill', 5)).toBe('chill')
  })
})

describe('shown_label and toggled', () => {
  test('quotes a label whose spacing sets it apart, and leaves others alone', () => {
    expect(shown_label('chill ')).toBe('"chill "')
    expect(shown_label('deep  house')).toBe('"deep  house"')
    expect(shown_label('deep house')).toBe('deep house')
  })

  test('toggles one label in a selection', () => {
    expect([...toggled(new Set(['a']), 'b')]).toEqual(['a', 'b'])
    expect([...toggled(new Set(['a', 'b']), 'a')]).toEqual(['b'])
  })
})

describe('relabel_request', () => {
  const list = rows()
  const ask = (verb: 'rename' | 'delete', cursor: string | null, selected: string[] = []) => relabel_request({ verb, rows: list, counts: COUNTS, cursor, selected: new Set(selected) })

  test('the cursor label, or the selection with managed labels left out and named', () => {
    expect(ask('rename', 'chill')).toEqual({ request: { kind: 'rename', labels: ['chill'], left_out: [] } })
    expect(ask('delete', 'chill', ['view/x', 'mix/a'])).toEqual({ request: { kind: 'delete', labels: ['mix/a'], left_out: ['view/x'] } })
  })

  test('a managed label alone says why instead', () => {
    expect(ask('rename', 'view/x')).toEqual({ refusal: MANAGED_REFUSAL })
  })

  test('on a facet header, e renames the prefix and Backspace deletes its labels; hand labels have no prefix', () => {
    expect(ask('rename', facet_key('mix'))).toEqual({ request: { kind: 'rename_facet', facet: 'mix', labels: ['mix/a', 'mix/b'], left_out: [] } })
    expect(ask('delete', facet_key('mix'))).toEqual({ request: { kind: 'delete', labels: ['mix/a', 'mix/b'], left_out: [] } })
    expect(ask('rename', facet_key(null))).toHaveProperty('refusal')
    expect(ask('rename', facet_key('view'))).toEqual({ refusal: MANAGED_REFUSAL })
  })
})
