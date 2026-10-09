// The track list's columns (STYLE.md § Components › Track list), legacy's
// plus album. Index, adopt, title, and the menu always show; the rest can be
// hidden from the header's menu, and the choice persists.

import type { TrackSort } from '#renderer/store/api.ts'

export type ColumnId = 'artist' | 'album' | 'tags' | 'kbps' | 'time' | 'format' | 'listens'

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
  { id: 'tags', label: 'Tags', width: 'minmax(80px, 0.9fr)' },
  { id: 'kbps', label: 'Kbps', width: '6ch', sort: 'bitrate', quiet: true, align: 'end' },
  { id: 'time', label: 'Time', width: '6ch', sort: 'duration', quiet: true, align: 'end' },
  { id: 'format', label: 'Fmt', width: '5ch', quiet: true },
  { id: 'listens', label: 'Listens', width: '8ch', sort: 'listen_count', quiet: true, align: 'end' }
]

export const NO_HIDDEN_COLUMNS: readonly ColumnId[] = []

// Beside the inspector the list loses these too, so it fits the narrower
// column without scrolling sideways; the persisted choice is untouched.
export const BESIDE_PANE_HIDDEN: readonly ColumnId[] = ['format', 'listens']

export const visible_columns = (hidden: readonly ColumnId[], beside_pane = false): Column[] =>
  COLUMNS.filter(({ id }) => !hidden.includes(id) && !(beside_pane && BESIDE_PANE_HIDDEN.includes(id)))

// index, adopt, title, the lead columns, +TAG, the rest, the menu.
const track_widths = (visible: readonly Column[]): string[] => [
  '4ch', '2ch', 'minmax(120px, 1.6fr)',
  ...visible.filter(({ lead }) => lead === true).map(({ width }) => width),
  '6ch',
  ...visible.filter(({ lead }) => lead !== true).map(({ width }) => width),
  '3ch'
]

export const grid_template = (visible: readonly Column[]): string => track_widths(visible).join(' ')

// The narrowest a row can be: each column at its minimum, the gaps, and the
// row's padding. Header and rows both hold it, so a narrow list scrolls
// sideways as one.
export const grid_min_width = (visible: readonly Column[]): string => {
  const widths = track_widths(visible)
  const minimums = widths.map((width) => /^minmax\(([^,]+),/.exec(width)?.[1]?.trim() ?? width)
  return `calc(${minimums.join(' + ')} + ${widths.length - 1} * var(--space-sm) + var(--space-sm) + var(--space-lg))`
}
