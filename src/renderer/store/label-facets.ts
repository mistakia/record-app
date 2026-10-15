// Labels grouped into facets by their prefix: `tier/personal` belongs to the
// `tier` facet, and a label with no `/` is a hand label. A track filter
// matches any label within a facet and every facet selected, while each
// hand label must match on its own, as the flat tag filter did. The node
// takes that as `tag_groups` (any-of within a group, all-of across groups)
// beside `tags` (each a group of one).

import type { TagCount } from '#renderer/api/types.ts'

// The exporter's facets first, in the order a reader narrows by, then any
// other prefix A to Z; hand labels come last.
const FACET_ORDER = ['tier', 'origin', 'listening-era', 'playlist', 'dj-session', 'discovered-via', 'view']

// The facet a label belongs to, or null for a hand label.
export const label_facet = (label: string): string | null => {
  const slash = label.indexOf('/')
  return slash > 0 ? label.slice(0, slash) : null
}

// The label without its facet prefix, as a facet lists it.
export const label_value = (label: string): string => {
  const facet = label_facet(label)
  return facet === null ? label : label.slice(facet.length + 1)
}

export interface Facet {
  // null for the hand labels.
  facet: string | null
  labels: TagCount[]
}

const facet_rank = (facet: string | null): [number, string] => {
  if (facet === null) return [FACET_ORDER.length + 1, '']
  const known = FACET_ORDER.indexOf(facet)
  return known === -1 ? [FACET_ORDER.length, facet] : [known, '']
}

// A library's labels as facets, each listing its labels A to Z.
export const group_facets = (counts: readonly TagCount[]): Facet[] => {
  const facets = new Map<string | null, TagCount[]>()
  for (const count of counts) {
    const facet = label_facet(count.tag)
    const labels = facets.get(facet)
    if (labels === undefined) facets.set(facet, [count])
    else labels.push(count)
  }
  return [...facets.entries()]
    .map(([facet, labels]) => ({ facet, labels: labels.sort((a, b) => a.tag.localeCompare(b.tag)) }))
    .sort((a, b) => {
      const [rank_a, name_a] = facet_rank(a.facet)
      const [rank_b, name_b] = facet_rank(b.facet)
      return rank_a - rank_b || name_a.localeCompare(name_b)
    })
}

// The node's filter for the selected labels, canonical so equal selections
// share one cache entry.
export const label_filter_args = (selected: readonly string[]): { tags?: string[], tag_groups?: string } => {
  const hand = selected.filter((label) => label_facet(label) === null).sort()
  const groups = new Map<string, string[]>()
  for (const label of selected) {
    const facet = label_facet(label)
    if (facet === null) continue
    const labels = groups.get(facet)
    if (labels === undefined) groups.set(facet, [label])
    else labels.push(label)
  }
  const tag_groups = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, labels]) => labels.sort())
  return {
    ...(hand.length === 0 ? {} : { tags: hand }),
    ...(tag_groups.length === 0 ? {} : { tag_groups: JSON.stringify(tag_groups) })
  }
}
