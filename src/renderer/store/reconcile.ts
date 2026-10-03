// The stale-to-fresh transition (spec §8.8.5) after each (re)connect:
// invalidate every cached surface so whatever is on screen refetches, wait
// for those refetches, then mark the data fresh, which unblocks writes. The
// head-check by library log head waits on chapter 7 v1.1.0; until then the
// full refetch of visible surfaces stands in for it.

import { node_api } from './api.ts'
import { reconcile_finished, reconcile_started } from './connection.ts'
import { NODE_API_TAGS } from './event-invalidation.ts'
import type { AppDispatch, RootState } from './index.ts'

export const reconcile = ({ connection_id }: { connection_id: number }) =>
  async (dispatch: AppDispatch, get_state: () => RootState): Promise<void> => {
    dispatch(reconcile_started({ connection_id }))
    dispatch(node_api.util.invalidateTags([...NODE_API_TAGS]))
    // Refetches start as the invalidation is processed; collect them a tick later.
    await new Promise((resolve) => setTimeout(resolve, 0))
    const results = await Promise.all(dispatch(node_api.util.getRunningQueriesThunk()))
    const ok = results.every((result) => !result.isError)
    if (get_state().connection.events?.connection_id !== connection_id) return
    dispatch(reconcile_finished({ connection_id, ok }))
  }
