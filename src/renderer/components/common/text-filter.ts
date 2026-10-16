// The on-demand text filter's match (STYLE.md § Tag chips, § Facet sidebar):
// case-insensitive, every word of the query somewhere in the text, in any
// order, so `fam 3` finds `origin/family-3`.

export const matches_filter = (text: string, query: string): boolean => {
  const words = query.trim().toLowerCase().split(/\s+/).filter((word) => word !== '')
  const haystack = text.toLowerCase()
  return words.every((word) => haystack.includes(word))
}
