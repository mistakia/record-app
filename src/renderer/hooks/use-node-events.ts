// Wires the main process's event connection into the store: its state into
// the connection slice, each event into a batched cache invalidation, and
// each new connection into a reconcile (spec §8.7.7: full reconciliation on
// every reconnect).

import { useEffect } from 'react'

import type { EventsState } from '#shared/bridge.ts'
import { node_api } from '#renderer/store/api.ts'
import { events_state_changed } from '#renderer/store/connection.ts'
import { create_invalidation_batcher, tags_for_event } from '#renderer/store/event-invalidation.ts'
import { use_app_dispatch } from '#renderer/store/index.ts'
import { reconcile } from '#renderer/store/reconcile.ts'

export const use_node_events = (): void => {
  const dispatch = use_app_dispatch()

  useEffect(() => {
    let reconciled_up_to = 0
    const batcher = create_invalidation_batcher({ flush: (tags) => { dispatch(node_api.util.invalidateTags(tags)) } })

    const apply_state = (state: EventsState): void => {
      dispatch(events_state_changed(state))
      if (state.status !== 'open' || state.connection_id <= reconciled_up_to) return
      reconciled_up_to = state.connection_id
      // Pending event invalidations are covered by the full refetch.
      batcher.cancel()
      dispatch(reconcile({ connection_id: state.connection_id })).catch(() => {})
    }

    const off_state = window.record.events.on_state(apply_state)
    const off_event = window.record.events.on_event((message) => { batcher.add(tags_for_event(message.type)) })
    window.record.events.get_state().then(apply_state).catch(() => {})
    return () => {
      off_state()
      off_event()
      batcher.cancel()
    }
  }, [dispatch])
}
