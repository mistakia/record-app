// Mirrors main's bundled-node state into the store.

import { useEffect } from 'react'

import { bundled_state_changed } from '#renderer/store/bundled.ts'
import { use_app_dispatch } from '#renderer/store/index.ts'

export const use_bundled_node = (): void => {
  const dispatch = use_app_dispatch()
  useEffect(() => {
    const off = window.record.bundled.on_state((state) => { dispatch(bundled_state_changed(state)) })
    window.record.bundled.get_state().then((state) => { dispatch(bundled_state_changed(state)) }).catch(() => {})
    return off
  }, [dispatch])
}
