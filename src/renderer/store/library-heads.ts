// What the head-check compares (spec §8.8.5): per library, its log heads and
// the index facts a refetch would show (track count, whether indexing is
// running), and the identity library's heads, which move with pins, links,
// and own-library changes. Pure, so main-side tests use it too.

import type { Library } from '#renderer/api/types.ts'
import { AGGREGATE } from './cache-ids.ts'

export interface LibraryMark {
  address: string
  heads: string
  track_count: number
  is_processing_index: boolean
  library_type: string
  is_own: boolean
}

const heads_key = (heads: readonly string[]): string => [...heads].sort().join('\n')

// A library without heads (as in a snapshot taken before v1.1) is left out,
// so the next check counts it as moved.
export const mark_libraries = (libraries: readonly Library[]): Map<string, LibraryMark> => new Map(libraries.filter((library) => Array.isArray(library.heads)).map((library) => [library.address, {
  address: library.address,
  heads: heads_key(library.heads),
  track_count: library.track_count,
  is_processing_index: library.is_processing_index,
  library_type: library.library_type,
  is_own: library.is_own
}]))

export const same_heads = (a: readonly string[] | null, b: readonly string[] | null): boolean =>
  a !== null && b !== null && heads_key(a) === heads_key(b)

// Libraries that moved (heads or index), appeared, or went away.
export const moved_libraries = ({ before, after }: { before: ReadonlyMap<string, LibraryMark>, after: ReadonlyMap<string, LibraryMark> }): LibraryMark[] => [
  ...[...after.values()].filter((mark) => {
    const known = before.get(mark.address)
    return known === undefined || known.heads !== mark.heads || known.track_count !== mark.track_count || known.is_processing_index !== mark.is_processing_index
  }),
  ...[...before.values()].filter(({ address }) => !after.has(address))
]

type StaleTag = 'tracks' | 'tags' | 'listens' | { type: 'tracks' | 'tags' | 'about', id: string }

// The cache tags moved libraries, and a moved identity library, make stale.
// A move in an own library changes have_track on rows of every view, and an
// identity-library move can change is_pinned on any row, so both stale every
// track page.
export const tags_for_moved = ({ moved, identity_moved = false }: { moved: readonly LibraryMark[], identity_moved?: boolean }): StaleTag[] => {
  if (moved.length === 0 && !identity_moved) return []
  const tags: StaleTag[] = moved.flatMap(({ address }) => [
    { type: 'tracks' as const, id: address },
    { type: 'tags' as const, id: address },
    { type: 'about' as const, id: address }
  ])
  if (moved.length > 0) tags.push({ type: 'tracks', id: AGGREGATE }, { type: 'tags', id: AGGREGATE })
  if (identity_moved || moved.some(({ is_own }) => is_own)) tags.push('tracks')
  if (identity_moved || moved.some(({ library_type }) => library_type === 'listens')) tags.push('listens')
  return tags
}
