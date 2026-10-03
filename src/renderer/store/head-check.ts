// The head-check (spec §8.8.5): compare each library's log heads with the
// last ones known (from the previous fetch, or the hibernation snapshot)
// and refetch only what a moved head can have changed. It runs on every
// connection, inside reconcile, and every 5 minutes while connected, so a
// missed WebSocket event cannot leave a surface stale for long.

import type { Library } from '#renderer/api/types.ts'
import { node_api } from './api.ts'
import { moved_libraries, tags_for_moved } from './library-heads.ts'
import type { AppDispatch, RootState } from './index.ts'

export const HEAD_CHECK_INTERVAL_MS = 5 * 60_000

const cached_libraries = (state: RootState): Library[] | undefined => node_api.endpoints.get_libraries.select()(state).data

// Refetches the library list and invalidates what moved. With no list to
// compare against, everything is refetched. extra names tags to refetch
// regardless, as the page a snapshot restored with trimmed fields.
export const head_check = ({ extra = [] }: { extra?: Array<{ type: 'tracks', id: string }> } = {}) =>
  async (dispatch: AppDispatch, get_state: () => RootState): Promise<{ moved: number | null }> => {
    const before = cached_libraries(get_state())
    const result = await dispatch(node_api.endpoints.get_libraries.initiate(undefined, { forceRefetch: true, subscribe: false }))
    if (result.data === undefined) return { moved: null }
    if (before === undefined) {
      dispatch(node_api.util.invalidateTags(['tracks', 'tags', 'about', 'listens']))
      return { moved: null }
    }
    const moved = moved_libraries({ before, after: result.data })
    const tags = [...tags_for_moved(moved), ...extra]
    if (tags.length > 0) dispatch(node_api.util.invalidateTags(tags))
    return { moved: moved.length }
  }
