// Labels that differ only in case or spacing (`Chill` and `chill `), found
// by their normalize_tag form. Each group merges into its most-used member,
// never into the lowercase form, so `AC/DC` never becomes facet `ac`.
// A tie goes to the first by code point, so the cased form wins. Managed
// labels are left out: the node owns them.

import type { TagCount } from '#renderer/api/types.ts'
import { normalize_tag } from '#renderer/components/track/tag-suggest.ts'

export interface TagCollision {
  // Most-used first; the first is the merge target.
  members: TagCount[]
}

export const tag_collisions = (counts: readonly TagCount[]): TagCollision[] => {
  const groups = new Map<string, TagCount[]>()
  for (const count of counts) {
    if (count.managed) continue
    const form = normalize_tag(count.tag)
    groups.set(form, [...groups.get(form) ?? [], count])
  }
  return [...groups.values()]
    .filter((members) => members.length > 1)
    .map((members) => ({ members: [...members].sort((a, b) => b.count - a.count || (a.tag < b.tag ? -1 : 1)) }))
    .sort((a, b) => a.members[0]!.tag.localeCompare(b.members[0]!.tag))
}
