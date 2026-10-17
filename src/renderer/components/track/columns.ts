// The track list's columns (STYLE.md § Components › Track list), legacy's
// plus album. Index, adopt, title, and the menu always show; the rest can be
// hidden from the header's menu, and the choice persists. A column's width
// starts at its default here; a dragged or keyed resize overrides it with a
// pixel width, held in the same local storage as the hidden set.

import type { TrackSort } from '#renderer/store/api.ts'

// title heads the sortable data columns so a resize can hold it too.
export type ColumnId = 'title' | 'artist' | 'album' | 'tags' | 'kbps' | 'time' | 'format' | 'listens'

export interface Column {
  id: ColumnId
  label: string
  width: string
  sort?: TrackSort
  // Rendered in tertiary ink, as metadata.
  quiet?: boolean
  align?: 'end'
  // Lead columns sit before the +TAG column, the rest after it.
  lead?: boolean
}

export const COLUMNS: readonly Column[] = [
  { id: 'artist', label: 'Artist', width: 'minmax(80px, 1fr)', sort: 'artist', lead: true },
  { id: 'album', label: 'Album', width: 'minmax(80px, 1fr)', sort: 'album', lead: true },
  { id: 'tags', label: 'Tags', width: 'minmax(100px, 1.4fr)' },
  { id: 'kbps', label: 'Kbps', width: '6ch', sort: 'bitrate', quiet: true, align: 'end' },
  { id: 'time', label: 'Time', width: '6ch', sort: 'duration', quiet: true, align: 'end' },
  { id: 'format', label: 'Fmt', width: '5ch', quiet: true },
  { id: 'listens', label: 'Listens', width: '8ch', sort: 'listen_count', quiet: true, align: 'end' }
]

export const NO_HIDDEN_COLUMNS: readonly ColumnId[] = []

// A column's resized width, in CSS pixels, by id. A column with none keeps its
// default width from COLUMNS. The fallback below must be a stable constant for
// use_view_pref.
export type ColumnWidths = Partial<Record<ColumnId, number>>

export const NO_COLUMN_WIDTHS: ColumnWidths = {}

// Beside the inspector the list loses these too, so it fits the narrower
// column without scrolling sideways; the persisted choice is untouched.
export const BESIDE_PANE_HIDDEN: readonly ColumnId[] = ['format', 'listens']

export const visible_columns = (hidden: readonly ColumnId[], beside_pane = false): Column[] =>
  COLUMNS.filter(({ id }) => !hidden.includes(id) && !(beside_pane && BESIDE_PANE_HIDDEN.includes(id)))

// index, adopt, title, the lead columns, +TAG, the rest, the menu.
const track_widths = (visible: readonly Column[], widths: ColumnWidths = NO_COLUMN_WIDTHS): string[] => {
  // A resized column keeps its pixels; the flexible defaults give way, so the
  // remaining space spreads over the columns still at their defaults.
  const wide = (id: ColumnId, fallback: string): string => widths[id] === undefined ? fallback : `${widths[id]}px`
  return [
    '4ch',
    '2ch',
    wide('title', 'minmax(120px, 1.6fr)'),
    ...visible.filter(({ lead }) => lead === true).map(({ id, width }) => wide(id, width)),
    '6ch',
    ...visible.filter(({ lead }) => lead !== true).map(({ id, width }) => wide(id, width)),
    '3ch'
  ]
}

export const grid_template = (visible: readonly Column[], widths: ColumnWidths = NO_COLUMN_WIDTHS): string =>
  track_widths(visible, widths).join(' ')

// The narrowest a row can be: each column at its minimum, the gaps, and the
// row's padding. Header and rows both hold it, so a narrow list scrolls
// sideways as one.
export const grid_min_width = (visible: readonly Column[], widths: ColumnWidths = NO_COLUMN_WIDTHS): string => {
  const tracks = track_widths(visible, widths)
  const minimums = tracks.map((width) => /^minmax\(([^,]+),/.exec(width)?.[1]?.trim() ?? width)
  return `calc(${minimums.join(' + ')} + ${tracks.length - 1} * var(--space-sm) + var(--space-sm) + var(--space-lg))`
}

// The width that fits a column to what it holds: the widest of its header and
// the cells measured, rounded up with a hair of room, held to the resize
// bounds.
export const fit_column_width = ({ contents, min, max }: { contents: readonly number[], min: number, max: number }): number =>
  Math.min(Math.max(Math.ceil(Math.max(0, ...contents)) + 2, min), max)
