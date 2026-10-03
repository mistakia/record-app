// Which libraries' log heads moved between two library lists, and the cache
// tags that makes stale (spec §8.8.5). Pure, so main-side tests use it too.

import type { Library } from '#renderer/api/types.ts'
import { AGGREGATE } from './cache-ids.ts'

const same_heads = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n')

// Libraries whose heads moved, appeared, or went away.
export const moved_libraries = ({ before, after }: { before: readonly Library[], after: readonly Library[] }): Library[] => {
  const previous = new Map(before.map((library) => [library.address, library]))
  const current = new Set(after.map(({ address }) => address))
  return [
    ...after.filter((library) => { const known = previous.get(library.address); return known === undefined || !same_heads(known.heads, library.heads) }),
    ...before.filter(({ address }) => !current.has(address))
  ]
}

// The cache tags a set of moved libraries makes stale.
export const tags_for_moved = (moved: readonly Library[]) => {
  if (moved.length === 0) return []
  const per_library = moved.flatMap(({ address }) => [
    { type: 'tracks' as const, id: address },
    { type: 'tags' as const, id: address },
    { type: 'about' as const, id: address }
  ])
  const listens = moved.some(({ library_type }) => library_type === 'listens') ? ['listens' as const] : []
  return [...per_library, { type: 'tracks' as const, id: AGGREGATE }, { type: 'tags' as const, id: AGGREGATE }, ...listens]
}
