// Tag suggestions for the inline adder: the visible tags that match what was
// typed, best first — a prefix, then a word start, then anywhere, then the
// letters in order — and within a rank the more used, then A to Z.

export interface TagCountLike {
  tag: string
  count: number
}

const subsequence = (needle: string, haystack: string): boolean => {
  let at = 0
  for (const char of haystack) {
    if (char === needle[at]) at++
    if (at === needle.length) return true
  }
  return needle.length === 0
}

const rank = (query: string, tag: string): number | null => {
  if (tag.startsWith(query)) return 0
  if (tag.split(/[\s\-_/]+/).some((word) => word.startsWith(query))) return 1
  if (tag.includes(query)) return 2
  if (subsequence(query, tag)) return 3
  return null
}

export const normalize_tag = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ')

export const suggest_tags = ({ query, tags, exclude = [], limit = 6 }: {
  query: string
  tags: readonly TagCountLike[]
  exclude?: readonly string[]
  limit?: number
}): string[] => {
  const typed = normalize_tag(query)
  if (typed === '') return []
  return tags
    .filter(({ tag }) => tag !== typed && !exclude.includes(tag))
    .map(({ tag, count }) => ({ tag, count, rank: rank(typed, tag.toLowerCase()) }))
    .filter((item): item is { tag: string, count: number, rank: number } => item.rank !== null)
    .sort((a, b) => a.rank - b.rank || b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit)
    .map(({ tag }) => tag)
}
