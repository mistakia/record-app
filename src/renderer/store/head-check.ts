// The head-check (spec §8.8.5): compare each library's log heads, and the
// identity library's, with the ones last checked, and refetch only what a
// move can have changed. The baseline is this module's own record of what
// was last checked, per node, written only after the stale surfaces were
// invalidated, so an event refetching the library list in between cannot
// hide a move. A snapshot seeds it at launch. It runs inside reconcile on
// every connection, and every 5 minutes while connected.

import type { Library } from '#renderer/api/types.ts'
import { node_api } from './api.ts'
import { mark_libraries, moved_libraries, same_heads, tags_for_moved, type LibraryMark } from './library-heads.ts'
import type { AppDispatch, RootState } from './index.ts'

export const HEAD_CHECK_INTERVAL_MS = 5 * 60_000

interface Baseline {
  node_key: string | null
  libraries: Map<string, LibraryMark>
  // Null when not known, as after a snapshot restore.
  identity_heads: string[] | null
}

let baseline: Baseline | null = null

export const seed_head_baseline = ({ node_key, libraries }: { node_key: string | null, libraries: readonly Library[] }): void => {
  baseline = { node_key, libraries: mark_libraries(libraries), identity_heads: null }
}

export const reset_head_baseline = (): void => { baseline = null }

// Refetches the library list and the identity library's heads, invalidates
// what moved, and records the new baseline. With no baseline for this node,
// every per-library surface is refetched. extra names tags to refetch
// regardless, as the page a snapshot restored with trimmed tracks.
export const head_check = ({ extra = [] }: { extra?: Array<{ type: 'tracks', id: string }> } = {}) =>
  async (dispatch: AppDispatch, get_state: () => RootState): Promise<{ moved: number | null }> => {
    const node_key = get_state().connection.config?.node_key ?? null
    const known = baseline?.node_key === node_key ? baseline : null
    const [libraries, identity] = await Promise.all([
      dispatch(node_api.endpoints.get_libraries.initiate(undefined, { forceRefetch: true, subscribe: false })),
      dispatch(node_api.endpoints.get_identity_heads.initiate(undefined, { forceRefetch: true, subscribe: false }))
    ])
    if (libraries.data === undefined) return { moved: null }
    // A node without the meta-log endpoint (404) has no identity heads to compare.
    const identity_heads = identity.data?.heads ?? null
    const after = mark_libraries(libraries.data)
    if (known === null) {
      dispatch(node_api.util.invalidateTags(['tracks', 'tags', 'about', 'listens']))
      baseline = { node_key, libraries: after, identity_heads }
      return { moved: null }
    }
    const moved = moved_libraries({ before: known.libraries, after })
    const identity_moved = identity_heads !== null && !same_heads(known.identity_heads, identity_heads)
    const tags = [...tags_for_moved({ moved, identity_moved }), ...extra]
    if (tags.length > 0) dispatch(node_api.util.invalidateTags(tags))
    baseline = { node_key, libraries: after, identity_heads }
    return { moved: moved.length + (identity_moved ? 1 : 0) }
  }
