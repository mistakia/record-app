// Wires the main process's event connection into the store: its state into
// the connection slice, each event into a batched cache invalidation, and
// each new connection into a reconcile (spec §8.7.7: full reconciliation on
// every reconnect).

import { useEffect } from 'react'
import { useStore } from 'react-redux'

import type { Library } from '#renderer/api/types.ts'
import { library_name } from '#renderer/components/library/library-category.ts'

import type { EventsState } from '#shared/bridge.ts'
import { node_api } from '#renderer/store/api.ts'
import { events_state_changed } from '#renderer/store/connection.ts'
import { create_invalidation_batcher, tags_for_event } from '#renderer/store/event-invalidation.ts'
import { import_event_received } from '#renderer/store/imports.ts'
import { use_app_dispatch, type RootState } from '#renderer/store/index.ts'
import { reconcile } from '#renderer/store/reconcile.ts'
import { notified } from '#renderer/store/notifications.ts'
import { library_event_received } from '#renderer/store/replication.ts'

// The notice for writes a revocation made inert (spec §8.6.8), or null
// when there is nothing of this identity's to tell: in an own library the
// inert entries are a grantee's, not ours.
export const describe_inert = ({ payload, libraries }: { payload: Record<string, unknown>, libraries: readonly Library[] | undefined }): string | null => {
  const count = Array.isArray(payload.entry_hashes) ? payload.entry_hashes.length : 0
  // Until the library list is known, whose writes these were is not.
  if (count === 0 || libraries === undefined) return null
  const library = libraries.find(({ address }) => address === payload.library_address)
  if (library?.is_own === true) return null
  const name = library === undefined ? String(payload.library_address) : library_name(library)
  return `A revoked capability made ${count} of your ${count === 1 ? 'change' : 'changes'} in ${name} no longer count: ` +
    'they were written after the library owner revoked it.'
}

export const use_node_events = (): void => {
  const dispatch = use_app_dispatch()
  const store = useStore<RootState>()
  const get_state = store.getState

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
      if (message.type === 'library:entries-inert') {
        const notice = describe_inert({ payload: message.payload, libraries: node_api.endpoints.get_libraries.select()(get_state()).data })
        if (notice !== null) dispatch(notified({ kind: 'error', message: notice }))
      }
      if (message.type.startsWith('import:')) dispatch(import_event_received(message))
      else if (message.type.startsWith('library:')) dispatch(library_event_received(message))
    })
    window.record.events.get_state().then(apply_state).catch(() => {})
    return () => {
      off_state()
      off_event()
      batcher.cancel()
    }
  }, [dispatch, get_state])
}
