// Mirrors main's bundled-node state into the store, and the connection view
// whenever its node key changes (the bundled node first answering, or a new
// identity), so per-node state follows the node.

import { useEffect } from 'react'

import { bundled_state_changed } from '#renderer/store/bundled.ts'
import { connection_loaded } from '#renderer/store/connection.ts'
import { use_app_dispatch } from '#renderer/store/index.ts'

export const use_bundled_node = (): void => {
  const dispatch = use_app_dispatch()
  useEffect(() => {
    const off_state = window.record.bundled.on_state((state) => { dispatch(bundled_state_changed(state)) })
    const off_view = window.record.connection.on_view((view) => { dispatch(connection_loaded(view)) })
    window.record.bundled.get_state().then((state) => { dispatch(bundled_state_changed(state)) }).catch(() => {})
    return () => {
      off_state()
      off_view()
    }
  }, [dispatch])
}
