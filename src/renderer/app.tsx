import { useEffect, type ReactElement } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'

import styles from './app.module.css'
import { ShortcutOverlay } from '#renderer/components/common/shortcut-overlay.tsx'
import { GoPanel } from '#renderer/components/layout/go-panel.tsx'
import { Toaster } from '#renderer/components/common/toaster.tsx'
import { TooltipLayer } from '#renderer/components/common/tooltip.tsx'
import { BackupPrompt } from '#renderer/components/identity/backup-prompt.tsx'
import { BundledBanner } from '#renderer/components/layout/bundled-banner.tsx'
import { ConnectionBanner } from '#renderer/components/layout/connection-banner.tsx'
import { IngestGauge } from '#renderer/components/layout/ingest-gauge.tsx'
import { PageActionsProvider } from '#renderer/components/layout/page-actions.tsx'
import { PageHead } from '#renderer/components/layout/page-head.tsx'
import { Sidebar } from '#renderer/components/layout/sidebar.tsx'
import { PlayerBar } from '#renderer/components/player/player-bar.tsx'
import { QueuePanel } from '#renderer/components/player/queue-panel.tsx'
import { use_bundled_node } from '#renderer/hooks/use-bundled-node.ts'
import { current_route, use_hibernation } from '#renderer/hooks/use-hibernation.ts'
import { use_hotkeys } from '#renderer/hooks/use-hotkeys.ts'
import { use_node_events } from '#renderer/hooks/use-node-events.ts'
import { use_media_session } from '#renderer/hooks/use-player.ts'
import { Identity } from '#renderer/pages/identity.tsx'
import { LibraryProfile, LibraryWriters } from '#renderer/pages/library-manage.tsx'
import { LinkLibrary } from '#renderer/pages/link-library.tsx'
import { IssueCapability } from '#renderer/pages/issue-capability.tsx'
import { NewLibrary } from '#renderer/pages/new-library.tsx'
import { Importer } from '#renderer/pages/importer.tsx'
import { Libraries } from '#renderer/pages/libraries.tsx'
import { Listens } from '#renderer/pages/listens.tsx'
import { Settings } from '#renderer/pages/settings.tsx'
import { Tracks } from '#renderer/pages/tracks.tsx'
import { ROUTES, route_path, settings_route } from '#renderer/routes.ts'
import { connection_loaded } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { restore_snapshot } from '#renderer/snapshot/hibernation.ts'

const RESTORABLE_ROUTES = new Set<string>(Object.values(ROUTES))

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
        if (RESTORABLE_ROUTES.has(route_path(snapshot.route)) && current_route() === '/') window.location.hash = snapshot.route
      }
      dispatch(connection_loaded(loaded))
    }
    load().catch(() => {})
  }, [dispatch])

  if (config === null) return <div className={styles.loading} />
  return (
    <HashRouter>
      <Shell configured={config.node_key !== null} />
    </HashRouter>
  )
}

// Pages that need a node; without one they send the user to Settings ›
// Connection.
const NODE_PAGES: Array<{ path: string, element: ReactElement }> = [
  { path: ROUTES.tracks, element: <Tracks /> },
  { path: ROUTES.listens, element: <Listens /> },
  { path: ROUTES.libraries, element: <Libraries /> },
  { path: ROUTES.link_library, element: <LinkLibrary /> },
  { path: ROUTES.new_library, element: <NewLibrary /> },
  { path: ROUTES.library_profile, element: <LibraryProfile /> },
  { path: ROUTES.library_writers, element: <LibraryWriters /> },
  { path: ROUTES.issue_capability, element: <IssueCapability /> },
  { path: ROUTES.import, element: <Importer /> },
  { path: ROUTES.identity, element: <Identity /> }
]

// STYLE.md § Layout: the sidebar, and a page column of head, banners, and
// body over the player bar.
const Shell = ({ configured }: { configured: boolean }) => {
  use_hotkeys()
  const queue_open = use_app_selector((state) => state.ui.queue_open)
  const unconfigured_route = settings_route('connection')
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.column}>
        <PageActionsProvider>
          <div className={styles.page}>
            <PageHead />
            <ConnectionBanner />
            <BundledBanner />
            <BackupPrompt />
            <main className={styles.body}>
              <Routes>
                <Route path={ROUTES.settings} element={<Settings />} />
                {NODE_PAGES.map(({ path, element }) => (
                  <Route key={path} path={path} element={configured ? element : <Navigate to={unconfigured_route} replace />} />
                ))}
                <Route path='*' element={<Navigate to={configured ? ROUTES.tracks : unconfigured_route} replace />} />
              </Routes>
            </main>
            <IngestGauge />
            {queue_open && <QueuePanel />}
            <Toaster />
            <ShortcutOverlay />
            <GoPanel />
          </div>
        </PageActionsProvider>
        <PlayerBar />
      </div>
      <TooltipLayer />
    </div>
  )
}
