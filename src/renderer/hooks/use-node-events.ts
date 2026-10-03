// Wires the main process's event connection into the store: its state into
// the connection slice, each event into a batched cache invalidation, and
// each new connection into a reconcile (spec §8.7.7: full reconciliation on
// every reconnect).

import { useEffect } from 'react'

import type { EventsState } from '#shared/bridge.ts'
import { node_api } from '#renderer/store/api.ts'
import { events_state_changed } from '#renderer/store/connection.ts'
import { create_invalidation_batcher, tags_for_event } from '#renderer/store/event-invalidation.ts'
import { import_event_received } from '#renderer/store/imports.ts'
import { use_app_dispatch } from '#renderer/store/index.ts'
import { reconcile } from '#renderer/store/reconcile.ts'
import { notified } from '#renderer/store/notifications.ts'
import { library_event_received } from '#renderer/store/replication.ts'

export const describe_inert = (payload: Record<string, unknown>): string => {
  const count = Array.isArray(payload.entry_hashes) ? payload.entry_hashes.length : 0
  return `A revoked capability made ${count} ${count === 1 ? 'change' : 'changes'} in ${String(payload.library_address)} no longer count. ` +
    'They were written after the library owner revoked it.'
}

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
    const off_event = window.record.events.on_event((message) => {
      batcher.add(tags_for_event(message.type))
      // Spec §8.6.8: writes a revocation invalidated are surfaced to the user.
      if (message.type === 'library:entries-inert') dispatch(notified({ kind: 'error', message: describe_inert(message.payload) }))
      if (message.type.startsWith('import:')) dispatch(import_event_received(message))
      else if (message.type.startsWith('library:')) dispatch(library_event_received(message))
    })
    window.record.events.get_state().then(apply_state).catch(() => {})
    return () => {
      off_state()
      off_event()
      batcher.cancel()
    }
  }, [dispatch])
}
