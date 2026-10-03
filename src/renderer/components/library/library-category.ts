// Spec §8.6.1: every visible library shows its category: own, shared (this
// identity holds an active capability there), linked (followed, read-only),
// or discovered (known only from peer discovery).

import type { Library } from '#renderer/api/types.ts'

export type LibraryCategory = 'own' | 'shared' | 'linked' | 'discovered'

export const library_category = (library: Pick<Library, 'is_own' | 'is_linked' | 'held_capability_ids'>): LibraryCategory =>
  library.is_own ? 'own' : library.held_capability_ids.length > 0 ? 'shared' : library.is_linked ? 'linked' : 'discovered'

export const library_name = (library: Pick<Library, 'alias' | 'name' | 'address'>): string =>
  library.alias ?? library.name ?? library.address

// The first active own recordstore: chapter 7 v1.1 lists every own library,
// the listens library and retired ones included.
export const own_library_address = (libraries: readonly Library[] | undefined): string | null =>
  libraries?.find(({ is_own, is_retired, library_type }) => is_own && !is_retired && library_type === 'recordstore')?.address ?? null

// The own libraries: from GET /identity/libraries when the node serves it,
// else from GET /libraries, which lists own libraries too (an older node, a
// query still loading, or a hibernation restore that holds only the latter).
export const own_libraries_of = ({ own, libraries }: {
  own: readonly Library[] | undefined
  libraries: readonly Library[] | undefined
}): Library[] => [...(own ?? libraries?.filter(({ is_own }) => is_own) ?? [])]

// A profile is edited on an active recordstore: the node refuses writes to a
// retired library, and the listens library holds listens only.
export const has_profile = (library: Pick<Library, 'is_retired' | 'library_type'>): boolean =>
  !library.is_retired && library.library_type === 'recordstore'

// Retirement is permanent, and the listens library is never retired (§4.8.3).
export const can_retire = (library: Pick<Library, 'is_retired' | 'library_type'>): boolean =>
  !library.is_retired && library.library_type !== 'listens'

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

// Which libraries hold a track, by category (spec §8.6.7), as in "2 own,
// 1 shared, 3 linked". Addresses the app does not list count as discovered.
export const describe_holders = ({ addresses, libraries }: { addresses: readonly string[] | undefined, libraries: readonly Library[] | undefined }): string | null => {
  if (addresses === undefined || addresses.length === 0) return null
  const by_address = new Map((libraries ?? []).map((library) => [library.address, library]))
  const counts: Record<LibraryCategory, number> = { own: 0, shared: 0, linked: 0, discovered: 0 }
  for (const address of addresses) {
    const library = by_address.get(address)
    counts[library === undefined ? 'discovered' : library_category(library)]++
  }
  return (['own', 'shared', 'linked', 'discovered'] as const).filter((category) => counts[category] > 0).map((category) => `${counts[category]} ${category}`).join(', ')
}
