// The inline adder's rows. With nothing typed, the view's most used tags;
// typing narrows them to the tags that match, best first — the tag itself,
// a prefix, a word start, anywhere, then the letters in order — and within a
// rank the more used, then A to Z, each with the letters it matched. A typed
// tag the view does not have ends the list as a `create` row.

export interface TagCountLike {
  tag: string
  count: number
}

export type AdderRow =
  | { kind: 'tag', tag: string, count: number, matched: readonly number[] }
  | { kind: 'create', tag: string }

const span = (from: number, length: number): number[] => Array.from({ length }, (_, at) => from + at)

const subsequence = (needle: string, haystack: string): number[] | null => {
  const found: number[] = []
  for (let at = 0; at < haystack.length && found.length < needle.length; at++) {
    if (haystack[at] === needle[found.length]) found.push(at)
  }
  return found.length === needle.length ? found : null
}

const match = (query: string, tag: string): { rank: number, matched: number[] } | null => {
  if (tag === query) return { rank: 0, matched: span(0, query.length) }
  if (tag.startsWith(query)) return { rank: 1, matched: span(0, query.length) }
  const word = [...tag.matchAll(/[^\s\-_/]+/g)].find(({ 0: text }) => text.startsWith(query))
  if (word !== undefined) return { rank: 2, matched: span(word.index, query.length) }
  const inside = tag.indexOf(query)
  if (inside !== -1) return { rank: 3, matched: span(inside, query.length) }
  const letters = subsequence(query, tag)
  return letters === null ? null : { rank: 4, matched: letters }
}

export const normalize_tag = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ')

export const suggest_tags = ({ query, tags, exclude = [], limit = 6 }: {
  query: string
  tags: readonly TagCountLike[]
  // Tags the track already carries.
  exclude?: readonly string[]
  limit?: number
}): AdderRow[] => {
  const typed = normalize_tag(query)
  const offered = tags.filter(({ tag }) => !exclude.includes(tag))
  if (typed === '') {
    return [...offered]
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, limit)
      .map(({ tag, count }) => ({ kind: 'tag', tag, count, matched: [] }))
  }
  const rows: AdderRow[] = offered
    .map(({ tag, count }) => ({ tag, count, found: match(typed, tag.toLowerCase()) }))
    .filter((item): item is { tag: string, count: number, found: { rank: number, matched: number[] } } => item.found !== null)
    .sort((a, b) => a.found.rank - b.found.rank || b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit)
    .map(({ tag, count, found }) => ({ kind: 'tag', tag, count, matched: found.matched }))
  const known = tags.some(({ tag }) => tag === typed) || exclude.includes(typed)
  return known ? rows : [...rows, { kind: 'create', tag: typed }]
}

// ↑ and ↓ through the rows. Null is the field itself: ↓ from it goes to the
// first row, ↑ to the last, and moving past either end returns to it.
export const move_highlight = ({ highlight, count, step }: {
  highlight: number | null
  count: number
  step: 1 | -1
}): number | null => {
  if (count === 0) return null
  if (highlight === null) return step === 1 ? 0 : count - 1
  const next = highlight + step
  return next < 0 || next >= count ? null : next
}

// What Tab writes into the field: the highlighted row, else the first tag
// row once something is typed; null leaves Tab to move focus.
export const tab_completion = ({ rows, highlight, draft }: {
  rows: readonly AdderRow[]
  highlight: number | null
  draft: string
}): string | null => {
  const row = highlight === null ? (normalize_tag(draft) === '' ? undefined : rows.find(({ kind }) => kind === 'tag')) : rows[highlight]
  if (row === undefined || row.tag === draft) return null
  return row.tag
}
