// The stale-to-fresh transition (spec §8.8.5) after each (re)connect:
// refetch the node-wide surfaces (settings, peers, capabilities, the
// identity's libraries), run the head-check, which refetches only the
// libraries whose heads moved since they were last seen, wait for those
// refetches, then mark the data fresh, which unblocks writes. A failed
// attempt is retried with backoff (1 s doubling to 30 s) for as long as the
// same connection stays open, so a passing node error does not leave the app
// stale with writes blocked; a retry refetches everything.

import { node_api } from './api.ts'
import { reconcile_finished, reconcile_started } from './connection.ts'
import { NODE_API_TAGS } from './event-invalidation.ts'
import { head_check } from './head-check.ts'
import { take_restored_page } from '#renderer/snapshot/restored.ts'
import { live_progress_cleared } from './replication.ts'
import type { AppDispatch, RootState } from './index.ts'

const RETRY_MIN_MS = 1_000
const RETRY_MAX_MS = 30_000

export const reconcile_retry_delay_ms = (attempt: number): number => Math.min(RETRY_MAX_MS, RETRY_MIN_MS * 2 ** attempt)

const sleep = async (ms: number): Promise<void> => { await new Promise((resolve) => setTimeout(resolve, ms)) }

export const reconcile = ({ connection_id, wait = sleep }: { connection_id: number, wait?: (ms: number) => Promise<void> }) =>
  async (dispatch: AppDispatch, get_state: () => RootState): Promise<void> => {
    const still_current = (): boolean => {
      const { events } = get_state().connection
      return events?.status === 'open' && events.connection_id === connection_id
    }
    for (let attempt = 0; ; attempt++) {
      const started_at = Date.now()
      dispatch(reconcile_started({ connection_id }))
      dispatch(live_progress_cleared())
      if (attempt === 0) {
        dispatch(node_api.util.invalidateTags(['settings', 'peers', 'capabilities', 'own_libraries']))
        // A page the snapshot restored carries trimmed tracks: refetch it once
        // even when its library's heads have not moved.
        const restored = take_restored_page()
        await dispatch(head_check({ extra: restored === null ? [] : [{ type: 'tracks', id: restored }] }))
      } else {
        dispatch(node_api.util.invalidateTags([...NODE_API_TAGS]))
      }
      // Refetches start as the invalidation is processed; collect them a
      // tick later, and keep waiting while any is still running.
      await wait(0)
      for (let running = dispatch(node_api.util.getRunningQueriesThunk()); running.length > 0; running = dispatch(node_api.util.getRunningQueriesThunk())) {
        await Promise.all(running)
      }
      if (!still_current()) return
      // Fresh when every cached surface has data and none failed, and the
      // library list behind the head-check was fetched in this attempt.
      // The identity heads are the head-check's own input, not a surface.
      const queries = Object.values(get_state().node_api.queries)
        .filter((entry) => entry !== undefined && entry.status !== 'uninitialized' && entry.endpointName !== 'get_identity_heads')
      const libraries = node_api.endpoints.get_libraries.select()(get_state())
      // Started, not just finished, in this attempt: a check sent before the
      // reconnect could otherwise pass for this one.
      const ok = queries.every((entry) => entry?.status === 'fulfilled') && libraries.status === 'fulfilled' && (libraries.startedTimeStamp ?? 0) >= started_at
      dispatch(reconcile_finished({ connection_id, ok }))
      if (ok) return
      await wait(reconcile_retry_delay_ms(attempt))
      if (!still_current()) return
    }
  }
