import { useEffect } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router'

import styles from './app.module.css'
import { ConnectionBanner, ConnectionStatus } from '#renderer/components/layout/connection-banner.tsx'
import { PlayerBar } from '#renderer/components/player/player-bar.tsx'
import { current_route, use_hibernation } from '#renderer/hooks/use-hibernation.ts'
import { use_node_events } from '#renderer/hooks/use-node-events.ts'
import { ConnectionSettings } from '#renderer/pages/connection-settings.tsx'
import { Tracks } from '#renderer/pages/tracks.tsx'
import { connection_loaded } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { restore_snapshot } from '#renderer/snapshot/hibernation.ts'

const RESTORABLE_ROUTES = new Set(['/tracks', '/connection'])

export const App = () => {
  const dispatch = use_app_dispatch()
  const config = use_app_selector((state) => state.connection.config)
  use_node_events()
  use_hibernation()

  // Spec §8.8.3: the snapshot is read before any node query, so the first
  // render already shows the last-known surface, marked stale.
  useEffect(() => {
    const load = async () => {
      const [loaded, snapshot] = await Promise.all([window.record.connection.get(), window.record.snapshot.load()])
      if (snapshot !== null && snapshot.node_url === loaded.node_url) {
        await restore_snapshot({ dispatch, snapshot })
        if (RESTORABLE_ROUTES.has(snapshot.route) && current_route() === '/') window.location.hash = snapshot.route
      }
      dispatch(connection_loaded(loaded))
    }
    load().catch(() => {})
  }, [dispatch])

  if (config === null) return <div className={styles.loading}>Loading</div>
  const home = config.node_url === null ? '/connection' : '/tracks'

  return (
    <HashRouter>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <NavLink to='/tracks'>Tracks</NavLink>
          <NavLink to='/connection'>Connection</NavLink>
          <ConnectionStatus />
        </nav>
        <ConnectionBanner />
        <main className={styles.content}>
          <Routes>
            <Route path='/connection' element={<ConnectionSettings />} />
            <Route path='/tracks' element={config.node_url === null ? <Navigate to='/connection' replace /> : <Tracks />} />
            <Route path='*' element={<Navigate to={home} replace />} />
          </Routes>
        </main>
        <PlayerBar />
      </div>
    </HashRouter>
  )
}
