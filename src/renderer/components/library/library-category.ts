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

// How long a fresh link counts as replicating while the node reports
// nothing for it, so it is never shown as simply empty (spec §8.6.5) but
// also never as replicating forever.
export const RECENT_LINK_MS = 60_000

// The progress to show: live event progress only when it arrived after the
// node's last answer for the library list.
export const current_progress = ({ library, live_progress, libraries_fetched_at }: {
  library: Library
  live_progress: { progress: number, total: number, received_at: number } | undefined
  libraries_fetched_at: number | undefined
}): { progress: number, total: number } =>
  live_progress !== undefined && live_progress.received_at > (libraries_fetched_at ?? 0) ? live_progress : library.replication_status

export const is_replicating = ({ library, progress, linked_at, now }: {
  library: Library
  progress: { progress: number, total: number }
  linked_at: number | undefined
  now: number
}): boolean => {
  if (library.is_own) return false
  const recent = linked_at !== undefined && now - linked_at < RECENT_LINK_MS && library.replication_status.total === 0 && library.length === 0
  return library.is_replicating || progress.progress < progress.total || recent
}
