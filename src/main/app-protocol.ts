// The renderer is served from app://record/, a privileged standard scheme,
// rather than file://, so a packaged build can turn the
// GrantFileProtocolExtraPrivileges fuse off (Electron's security checklist
// item 18). Only files under the renderer's build directory are served; an
// encoded slash cannot climb out, since the check runs on the decoded path.

import { isAbsolute, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

import { net, protocol } from 'electron'

const SCHEME = 'app'
const HOST = 'record'

export const APP_ORIGIN = `${SCHEME}://${HOST}`

// Before the app is ready: a standard, secure scheme gets an origin, so the
// CSP's 'self', fetch, and blob: URLs behave as they do over https.
export const register_app_scheme = (): void => {
  protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }])
}

export const serve_app_files = (root: string): void => {
  protocol.handle(SCHEME, async (request) => {
    const url = new URL(request.url)
    if (url.host !== HOST) return new Response(null, { status: 404 })
    const path = join(root, decodeURIComponent(url.pathname))
    const inside = relative(root, path)
    if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) return new Response(null, { status: 404 })
    try {
      return await net.fetch(pathToFileURL(path).href)
    } catch {
      return new Response(null, { status: 404 })
    }
  })
}
