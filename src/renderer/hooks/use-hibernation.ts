// Hands main the current snapshot whenever it changed, checked every 5 s;
// main writes it to disk every 30 s and at quit (spec §8.8.3), so a quit
// keeps the surface as of the last check.

import { useEffect } from 'react'
import { useStore } from 'react-redux'

import type { TrackList } from '#renderer/api/types.ts'
import type { RootState } from '#renderer/store/index.ts'
import { build_snapshot, select_active_page, to_snapshot_active } from '#renderer/snapshot/hibernation.ts'
import type { HibernationSnapshot } from '#shared/snapshot.ts'

const CHECK_INTERVAL_MS = 5_000

export const current_route = (): string => {
  const route = window.location.hash.replace(/^#/, '')
  return route.startsWith('/') ? route : '/'
}

export const use_hibernation = (): void => {
  const store = useStore<RootState>()

  useEffect(() => {
    let last_sent = ''
    // The first page leaves the cache once the user pages on and events
    // invalidate it, so it is captured on every change, not only at a check.
    let previous_active: HibernationSnapshot['active'] = null
    let captured_page: TrackList | undefined
    const unsubscribe = store.subscribe(() => {
      const { page, library_address } = select_active_page(store.getState())
      if (page === undefined || page === captured_page) return
      captured_page = page
      previous_active = to_snapshot_active({ page, library_address })
    })

    const check = (): void => {
      const snapshot = build_snapshot({ state: store.getState(), route: current_route(), previous_active })
      if (snapshot === null) return
      const text = JSON.stringify(snapshot)
      if (text === last_sent) return
      last_sent = text
      window.record.snapshot.update({ ...snapshot, written_at_ms: Date.now() }).catch(() => {})
    }
    const timer = setInterval(check, CHECK_INTERVAL_MS)
    return () => {
      unsubscribe()
      clearInterval(timer)
    }
  }, [store])
}
