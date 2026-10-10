// What a key in the search field does while its recent searches are open:
// arrows move the highlight (up past the first row returns to the field),
// Enter runs the highlighted search, Esc closes the list. null leaves the
// key to the field.

export type RecentSearchKey =
  | { kind: 'highlight', index: number }
  | { kind: 'run', index: number }
  | { kind: 'close' }
  | null

export const recent_search_key = ({ key, highlighted, count }: { key: string, highlighted: number, count: number }): RecentSearchKey => {
  if (count === 0) return null
  switch (key) {
    case 'ArrowDown': return { kind: 'highlight', index: Math.min(highlighted + 1, count - 1) }
    case 'ArrowUp': return { kind: 'highlight', index: Math.max(highlighted - 1, -1) }
    case 'Enter': return highlighted >= 0 && highlighted < count ? { kind: 'run', index: highlighted } : null
    case 'Escape': return { kind: 'close' }
    default: return null
  }
}
