// Spec §8.6.1: every visible library shows its category. Chapter 7 serves
// own and linked; shared libraries (held capabilities) wait on v1.1.0. A
// library the node only knows from peer discovery is shown as discovered.

import type { Library } from '#renderer/api/types.ts'

export type LibraryCategory = 'own' | 'linked' | 'discovered'

export const library_category = (library: Pick<Library, 'is_own' | 'is_linked'>): LibraryCategory =>
  library.is_own ? 'own' : library.is_linked ? 'linked' : 'discovered'

export const library_name = (library: Pick<Library, 'alias' | 'name' | 'address'>): string =>
  library.alias ?? library.name ?? library.address

export const own_library_address = (libraries: readonly Library[] | undefined): string | null =>
  libraries?.find(({ is_own }) => is_own)?.address ?? null

// Replicating while the node says so, while entries remain, or while a
// freshly linked library has nothing yet (spec §8.6.5: never shown as
// simply empty).
export const is_replicating = ({ library, live_progress, recently_linked }: {
  library: Library
  live_progress: { progress: number, total: number } | undefined
  recently_linked: boolean
}): boolean => {
  if (library.is_own) return false
  const progress = live_progress ?? library.replication_status
  return library.is_replicating || progress.progress < progress.total || (recently_linked && library.length === 0)
}
