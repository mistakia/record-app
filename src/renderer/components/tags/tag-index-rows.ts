// The Tags page's index as one flat row list for the virtualizer: a header
// row per facet over its labels (hand labels last, as group_facets orders
// them), each row keyed so the cursor and selection follow a label through
// the re-sort every labels-changed refetch brings, not a position.

import type { TagCount } from '#renderer/api/types.ts'
import type { HotkeyAction } from '#renderer/hooks/hotkeys.ts'
import { matches_filter } from '#renderer/components/common/text-filter.ts'
import { group_facets } from '#renderer/store/label-facets.ts'

export type TagSort = 'count' | 'name'

export interface FacetRow {
  kind: 'facet'
  key: string
  // null for the hand labels.
  facet: string | null
  label_count: number
  // Sum of the label counts: a track carrying two labels counts twice.
  total: number
  folded: boolean
  // Every label in the facet is managed, filtered out or not, so the header
  // says so once.
  managed: boolean
}

export interface LabelRow {
  kind: 'label'
  key: string
  tag: string
  count: number
  managed: boolean
  // No library the identity can write labels to holds it, so a change
  // leaves it in place.
  not_writable: boolean
}

export type TagIndexRow = FacetRow | LabelRow

// The list keys the Tags index answers (list-commands.ts); any other list
// key falls through to the player and app keys.
export const TAG_LIST_ACTIONS: ReadonlySet<HotkeyAction> = new Set<HotkeyAction>([
  'cursor_down', 'cursor_up', 'cursor_first', 'cursor_last', 'extend_down', 'extend_up', 'extend_first', 'extend_last', 'toggle_selection',
  'activate', 'rename_labels', 'delete_labels', 'toggle_inspector', 'open_menu'
])

// The labels a node-managed library holds, read-only on the page.
export const managed_labels = (counts: readonly TagCount[]): Set<string> =>
  new Set(counts.flatMap(({ tag, managed }) => managed ? [tag] : []))

// A label as the page shows it: quoted when spacing sets it apart from a
// label that looks the same (`"chill "` beside `chill`).
export const shown_label = (label: string): string =>
  label !== label.trim() || /\s{2}/.test(label) ? JSON.stringify(label) : label

// A selection with the label added, or taken out when it was in.
export const toggled = (selected: ReadonlySet<string>, label: string): Set<string> => {
  const next = new Set(selected)
  if (next.has(label)) next.delete(label)
  else next.add(label)
  return next
}

// A label holds no control character (§2.5), so a header's key never
// collides with one.
export const facet_key = (facet: string | null): string => `\u0000${facet ?? ''}`

export const tag_index_rows = ({ counts, filter, sort, opened, writable }: {
  counts: readonly TagCount[]
  filter: string
  sort: TagSort
  // Facet keys opened; every other facet is folded, and a filter opens
  // every facet holding a match.
  opened: ReadonlySet<string>
  // Labels some writable label library holds; null until known.
  writable: ReadonlySet<string> | null
}): TagIndexRow[] => {
  const filtering = filter.trim() !== ''
  const rows: TagIndexRow[] = []
  for (const { facet, labels } of group_facets(counts)) {
    const shown = filtering ? labels.filter(({ tag }) => matches_filter(tag, filter)) : labels
    if (shown.length === 0) continue
    const key = facet_key(facet)
    const is_folded = !filtering && !opened.has(key)
    rows.push({ kind: 'facet', key, facet, label_count: shown.length, total: shown.reduce((sum, { count }) => sum + count, 0), folded: is_folded, managed: labels.every(({ managed }) => managed) })
    if (is_folded) continue
    const sorted = sort === 'count' ? [...shown].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)) : shown
    for (const { tag, count, managed } of sorted) {
      rows.push({ kind: 'label', key: tag, tag, count, managed, not_writable: writable !== null && !writable.has(tag) })
    }
  }
  return rows
}

// The row a cursor key lands on after moving `delta` rows, clamped; the
// first row when the key is gone.
export const move_cursor = (rows: readonly TagIndexRow[], cursor: string | null, delta: number): string | null => {
  if (rows.length === 0) return null
  const at = rows.findIndex(({ key }) => key === cursor)
  if (at === -1) return rows[0]!.key
  return rows[Math.max(0, Math.min(rows.length - 1, at + delta))]!.key
}

// The labels between anchor and cursor, inclusive, in the rows' current
// order; headers are not selectable.
export const select_range = (rows: readonly TagIndexRow[], anchor: string, cursor: string): string[] => {
  const from = rows.findIndex(({ key }) => key === anchor)
  const to = rows.findIndex(({ key }) => key === cursor)
  if (from === -1 || to === -1) return []
  const [low, high] = from < to ? [from, to] : [to, from]
  return rows.slice(low, high + 1).flatMap((row) => row.kind === 'label' ? [row.tag] : [])
}

// The labels a selection still names among the rows shown.
export const shown_selection = (rows: readonly TagIndexRow[], selected: ReadonlySet<string>): string[] =>
  rows.flatMap((row) => row.kind === 'label' && selected.has(row.tag) ? [row.tag] : [])

// What `e` or Backspace asks for: the selection's labels, else the cursor
// row's label, or on a facet header every label under it (`e` renames the
// prefix). Managed labels are left out and named; when nothing is left the
// key says why instead.
export type RelabelRequest =
  | { kind: 'rename', labels: string[], left_out: string[] }
  | { kind: 'rename_facet', facet: string, labels: string[], left_out: string[] }
  | { kind: 'delete', labels: string[], left_out: string[] }

// A non-breaking hyphen keeps `read-only` on one line.
export const MANAGED_REFUSAL = 'The node manages this label; it is read\u2011only here.'

export const relabel_request = ({ verb, rows, counts, cursor, selected }: {
  verb: 'rename' | 'delete'
  rows: readonly TagIndexRow[]
  counts: readonly TagCount[]
  cursor: string | null
  selected: ReadonlySet<string>
}): { request: RelabelRequest } | { refusal: string } | null => {
  const managed = managed_labels(counts)
  const split = (labels: readonly string[]) => ({ labels: labels.filter((label) => !managed.has(label)), left_out: labels.filter((label) => managed.has(label)) })
  const chosen = shown_selection(rows, selected)
  const row = rows.find(({ key }) => key === cursor)
  if (chosen.length === 0 && row?.kind === 'facet') {
    if (row.facet === null && verb === 'rename') return { refusal: 'Hand labels share no prefix to rename; rename them one at a time or select several to merge.' }
    const { labels, left_out } = split(group_facets(counts).find(({ facet }) => facet === row.facet)?.labels.map(({ tag }) => tag) ?? [])
    if (labels.length === 0) return { refusal: MANAGED_REFUSAL }
    return { request: verb === 'delete' || row.facet === null ? { kind: 'delete', labels, left_out } : { kind: 'rename_facet', facet: row.facet, labels, left_out } }
  }
  const named = chosen.length > 0 ? chosen : row?.kind === 'label' ? [row.tag] : []
  if (named.length === 0) return null
  const { labels, left_out } = split(named)
  if (labels.length === 0) return { refusal: MANAGED_REFUSAL }
  return { request: { kind: verb, labels, left_out } }
}
