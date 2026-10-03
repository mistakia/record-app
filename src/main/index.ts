// Main process entry: one instance, one window, and the IPC bridge to the
// node. All node traffic leaves from here, never from the renderer.

import { join } from 'node:path'

import { app, BrowserWindow, powerMonitor, session } from 'electron'

import { IPC_CHANNELS } from '#shared/bridge.ts'
import { APP_ORIGIN, register_app_scheme, serve_app_files } from './app-protocol.ts'
import { open_connection_store } from './connection-store.ts'
import { register_ipc } from './ipc.ts'
import { create_bundled_node } from './bundled/bundled-node.ts'
import { create_diagnostics } from './diagnostics.ts'
import { create_node_connection } from './node-connection.ts'
import { create_node_session } from './node-session.ts'
import { open_snapshot_store } from './snapshot-store.ts'
import { create_update_service, UPDATE_FEED_URL } from './updates.ts'
import { create_main_window, guard_web_contents } from './window.ts'

// Chromium's remote debugging would let any local process drive the app and
// reach the bridge, so a packaged release build exits on it before any window
// exists. The packaged smoke's own build (package:mac:test) bakes in the
// marker that allows it; nothing a user can set at run time does.
const DEBUGGING_SWITCHES = ['remote-debugging-port', 'remote-debugging-pipe', 'remote-debugging-address']
if (app.isPackaged && !__RECORD_TEST_BUILD__ && DEBUGGING_SWITCHES.some((name) => app.commandLine.hasSwitch(name))) {
  console.error('Record does not run with remote debugging enabled.')
  app.exit(1)
}

const PRELOAD_PATH = join(import.meta.dirname, '../preload/index.cjs')
const RENDERER_ROOT = join(import.meta.dirname, '../renderer')
// electron-vite sets this under `dev` only.
const DEV_SERVER_URL = app.isPackaged ? undefined : process.env.ELECTRON_RENDERER_URL

const renderer_url = DEV_SERVER_URL ?? `${APP_ORIGIN}/index.html`

const is_app_frame = (url: string): boolean => url.split('#')[0] === renderer_url.split('#')[0] ||
  (DEV_SERVER_URL !== undefined && new URL(url).origin === new URL(DEV_SERVER_URL).origin)

const SNAPSHOT_WRITE_INTERVAL_MS = 30_000

const open_window = (): BrowserWindow => create_main_window({ preload_path: PRELOAD_PATH, renderer_url })

const broadcast = (channel: string, payload: unknown): void => {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send(channel, payload)
}

// Started from whenReady rather than a top-level await, which would hold the
// module's evaluation open and stall tooling that waits for it to finish.
const start = async (): Promise<void> => {
  // The renderer needs no browser permission (camera, clipboard,
  // notifications, ...); copying the exported key goes through main.
  // eslint-disable-next-line n/no-callback-literal -- Electron's callback takes the grant as a boolean
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => { callback(false) })
  serve_app_files(RENDERER_ROOT)
  const user_data = app.getPath('userData')
  const store = await open_connection_store({ file_path: join(user_data, 'connection.json') })
  const snapshots = await open_snapshot_store({
    snapshot_path: join(user_data, 'snapshot.json'),
    settings_path: join(user_data, 'snapshot-settings.json')
  })
  const node_session = create_node_session({ broadcast })
  const manager = create_bundled_node({
    user_data,
    on_state: (state) => {
      broadcast(IPC_CHANNELS.bundled_state, state)
      connection.sync()
    }
  })
  let forget_identity = (): void => {}
  const connection = create_node_connection({
    store,
    manager,
    session: node_session,
    on_node_changed: () => { forget_identity() },
    on_view_changed: (view) => { broadcast(IPC_CHANNELS.connection_view, view) }
  })
  const updates = create_update_service({
    feed_url: UPDATE_FEED_URL,
    channel: 'stable',
    current_version: app.getVersion(),
    create_backend: () => { throw new Error('No update backend is installed.') }
  })
  updates.start()
  const diagnostics = create_diagnostics({ user_data, store, manager, connection, updates })
  forget_identity = register_ipc({ store, connection, manager, session: node_session, snapshots, diagnostics, is_app_frame }).forget_identity
  // Spec §8.8.3: written every 30 s when it changed, and on clean shutdown.
  const snapshot_timer = setInterval(() => { snapshots.flush().catch(() => {}) }, SNAPSHOT_WRITE_INTERVAL_MS)
  app.on('before-quit', () => {
    clearInterval(snapshot_timer)
    node_session.stop()
    snapshots.flush_sync()
  })
  // A socket that looked open before sleep is usually dead after it.
  powerMonitor.on('resume', () => { node_session.force_reconnect('Reconnecting after the computer woke.') })
  // Spec §8.4.5: the app does not exit before the bundled node has stopped.
  let node_stopped = false
  app.on('will-quit', (event) => {
    if (node_stopped || manager.get_state().status === 'stopped') return
    event.preventDefault()
    manager.stop().catch(() => {}).finally(() => {
      node_stopped = true
      app.quit()
    })
  })
  // A forced exit still takes the child with it, synchronously.
  process.on('exit', () => { manager.kill_now() })
  connection.start().catch((error: unknown) => { console.error(error) })
  open_window()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) open_window()
  })
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows()
    if (window === undefined) return
    if (window.isMinimized()) window.restore()
    window.focus()
  })
  register_app_scheme()
  app.on('web-contents-created', (_event, contents) => { guard_web_contents(contents) })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.whenReady().then(start).catch((error: unknown) => {
    console.error(error)
    app.quit()
  })
}
