import { useEffect, type ReactElement } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router'

import styles from './app.module.css'
import { Toaster } from '#renderer/components/common/toaster.tsx'
import { BackupPrompt } from '#renderer/components/identity/backup-prompt.tsx'
import { BundledBanner } from '#renderer/components/layout/bundled-banner.tsx'
import { ConnectionBanner, ConnectionStatus } from '#renderer/components/layout/connection-banner.tsx'
import { PlayerBar } from '#renderer/components/player/player-bar.tsx'
import { use_bundled_node } from '#renderer/hooks/use-bundled-node.ts'
import { current_route, use_hibernation } from '#renderer/hooks/use-hibernation.ts'
import { use_hotkeys } from '#renderer/hooks/use-hotkeys.ts'
import { use_node_events } from '#renderer/hooks/use-node-events.ts'
import { use_media_session } from '#renderer/hooks/use-player.ts'
import { ConnectionSettings } from '#renderer/pages/connection-settings.tsx'
import { Identity } from '#renderer/pages/identity.tsx'
import { Importer } from '#renderer/pages/importer.tsx'
import { Libraries } from '#renderer/pages/libraries.tsx'
import { Listens } from '#renderer/pages/listens.tsx'
import { Peers } from '#renderer/pages/peers.tsx'
import { Tracks } from '#renderer/pages/tracks.tsx'
import { connection_loaded } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { restore_snapshot } from '#renderer/snapshot/hibernation.ts'

const RESTORABLE_ROUTES = new Set(['/tracks', '/libraries', '/import', '/listens', '/peers', '/identity', '/connection'])

export const App = () => {
  const dispatch = use_app_dispatch()
  const config = use_app_selector((state) => state.connection.config)
  use_node_events()
  use_bundled_node()
  use_hibernation()
  use_media_session()

  // Spec §8.8.3: the snapshot is read before any node query, so the first
  // render already shows the last-known surface, marked stale.
  useEffect(() => {
    const load = async () => {
      const [loaded, snapshot] = await Promise.all([window.record.connection.get(), window.record.snapshot.load()])
      if (snapshot !== null && snapshot.node_key === loaded.node_key) {
        await restore_snapshot({ dispatch, snapshot })
        if (RESTORABLE_ROUTES.has(snapshot.route) && current_route() === '/') window.location.hash = snapshot.route
      }
      dispatch(connection_loaded(loaded))
    }
    load().catch(() => {})
  }, [dispatch])

  if (config === null) return <div className={styles.loading}>Loading</div>
  return (
    <HashRouter>
      <Shell configured={config.node_key !== null} />
    </HashRouter>
  )
}

// Pages that need a node; without one they send the user to Connection.
const NODE_PAGES: Array<{ path: string, label: string, element: ReactElement }> = [
  { path: '/tracks', label: 'Tracks', element: <Tracks /> },
  { path: '/libraries', label: 'Libraries', element: <Libraries /> },
  { path: '/import', label: 'Import', element: <Importer /> },
  { path: '/listens', label: 'Listens', element: <Listens /> },
  { path: '/peers', label: 'Peers', element: <Peers /> },
  { path: '/identity', label: 'Identity', element: <Identity /> }
]

const Shell = ({ configured }: { configured: boolean }) => {
  use_hotkeys()
  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        {NODE_PAGES.map(({ path, label }) => <NavLink key={path} to={path}>{label}</NavLink>)}
        <NavLink to='/connection'>Connection</NavLink>
        <ConnectionStatus />
      </nav>
      <ConnectionBanner />
      <BundledBanner />
      <BackupPrompt />
      <main className={styles.content}>
        <Routes>
          <Route path='/connection' element={<ConnectionSettings />} />
          {NODE_PAGES.map(({ path, element }) => (
            <Route key={path} path={path} element={configured ? element : <Navigate to='/connection' replace />} />
          ))}
          <Route path='*' element={<Navigate to={configured ? '/tracks' : '/connection'} replace />} />
        </Routes>
      </main>
      <PlayerBar />
      <Toaster />
    </div>
  )
}
