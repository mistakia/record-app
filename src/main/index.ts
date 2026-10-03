// Main process entry: one instance, one window, and the IPC bridge to the
// node. All node traffic leaves from here, never from the renderer.

import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { app, BrowserWindow, powerMonitor, session } from 'electron'

import { open_connection_store } from './connection-store.ts'
import { register_ipc } from './ipc.ts'
import { create_node_session } from './node-session.ts'
import { open_snapshot_store } from './snapshot-store.ts'
import { create_main_window, guard_web_contents } from './window.ts'

const PRELOAD_PATH = join(import.meta.dirname, '../preload/index.cjs')
const RENDERER_FILE = join(import.meta.dirname, '../renderer/index.html')
// electron-vite sets this under `dev` only.
const DEV_SERVER_URL = app.isPackaged ? undefined : process.env.ELECTRON_RENDERER_URL

const renderer = DEV_SERVER_URL === undefined ? { file: RENDERER_FILE } : { url: DEV_SERVER_URL }
const renderer_url = DEV_SERVER_URL ?? pathToFileURL(RENDERER_FILE).href

const is_app_frame = (url: string): boolean => url.split('#')[0] === renderer_url.split('#')[0] ||
  (DEV_SERVER_URL !== undefined && new URL(url).origin === new URL(DEV_SERVER_URL).origin)

const SNAPSHOT_WRITE_INTERVAL_MS = 30_000

const open_window = (): BrowserWindow => create_main_window({ preload_path: PRELOAD_PATH, renderer })

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
  const user_data = app.getPath('userData')
  const store = await open_connection_store({ file_path: join(user_data, 'connection.json') })
  const snapshots = await open_snapshot_store({
    snapshot_path: join(user_data, 'snapshot.json'),
    settings_path: join(user_data, 'snapshot-settings.json')
  })
  const node_session = create_node_session({ broadcast })
  register_ipc({ store, session: node_session, snapshots, is_app_frame })
  // Spec §8.8.3: written every 30 s when it changed, and on clean shutdown.
  const snapshot_timer = setInterval(() => { snapshots.flush().catch(() => {}) }, SNAPSHOT_WRITE_INTERVAL_MS)
  app.on('before-quit', () => {
    clearInterval(snapshot_timer)
    node_session.stop()
    snapshots.flush_sync()
  })
  // A socket that looked open before sleep is usually dead after it.
  powerMonitor.on('resume', () => { node_session.force_reconnect('Reconnecting after the computer woke.') })
  node_session.start(store.get().node_url)
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
  app.on('web-contents-created', (_event, contents) => { guard_web_contents(contents) })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.whenReady().then(start).catch((error: unknown) => {
    console.error(error)
    app.quit()
  })
}
