// The one application window, hardened per spec §8.10.2 (webPreferences) and
// §8.10.5 (navigation guards).

import { BrowserWindow, shell, type WebContents } from 'electron'

const EXTERNAL_SCHEMES = new Set(['https:', 'http:', 'mailto:'])

// Spec §8.10.5: parseable, an allowlisted scheme, and no control characters
// or shell metacharacters.
const open_external_url = (target: string): void => {
  // eslint-disable-next-line no-control-regex -- matching control characters is the point
  if (/[\u0000-\u001f\u007f\s"'`<>\\^{}|$;&]/.test(target)) return
  let url: URL
  try {
    url = new URL(target)
  } catch {
    return
  }
  if (!EXTERNAL_SCHEMES.has(url.protocol)) return
  shell.openExternal(url.href).catch(() => {})
}

// The renderer is a single page that never navigates: route changes are hash
// changes, which do not fire will-navigate. Every navigation and window.open
// is refused, and an external link opens in the system browser. index.ts
// applies this to every web contents through web-contents-created.
export const guard_web_contents = (contents: WebContents): void => {
  contents.on('will-navigate', (event, url) => {
    event.preventDefault()
    open_external_url(url)
  })
  contents.on('will-redirect', (event) => { event.preventDefault() })
  contents.on('will-attach-webview', (event) => { event.preventDefault() })
  contents.setWindowOpenHandler(({ url }) => {
    open_external_url(url)
    return { action: 'deny' }
  })
}

export const create_main_window = ({ preload_path, renderer_url }: {
  preload_path: string
  renderer_url: string
}): BrowserWindow => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Record',
    show: false,
    // STYLE.md § OS Surface: the paper color before first paint, so the
    // window never flashes, and on macOS the traffic lights inset over the
    // sidebar, whose top is a drag region.
    backgroundColor: '#f7f7f4',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 14, y: 13 } } : {}),
    // enableRemoteModule (§8.10.2) no longer exists: Electron removed the
    // remote module in v14, so it is always off.
    webPreferences: {
      preload: preload_path,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    }
  })
  window.once('ready-to-show', () => { window.show() })
  window.loadURL(renderer_url).catch(() => {})
  return window
}
