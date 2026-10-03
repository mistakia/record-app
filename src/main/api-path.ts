// Turns a renderer request into a node API path, accepting only a method and
// path template present in the pinned 7-http-api.yaml (spec §8.10.3: no
// arbitrary URL from the renderer). Imports nothing from Electron.

import { API_ROUTES } from '#shared/api-routes.ts'
import type { RequestQuery } from '#shared/bridge.ts'

const route_key = (method: string, path_template: string): string => `${method} ${path_template}`

const KNOWN_ROUTES = new Set<string>(API_ROUTES.map(({ method, path_template }) => route_key(method, path_template)))

// Routes the generic JSON request never carries: audio is binary and has its
// own channel, and file import takes paths that main resolves itself.
const DEDICATED_ROUTES = new Set(['get /audio/{cid}', 'head /audio/{cid}', 'post /import/file'])

const QUERY_KEY = /^[a-z][a-z_]*$/
const DOT_SEGMENTS = new Set(['.', '..'])

export type ApiPathCheck = { ok: true, path: string } | { ok: false, reason: string }

export const build_api_path = ({ method, path_template, params = {}, query = {} }: {
  method: string
  path_template: string
  params?: Record<string, string>
  query?: RequestQuery
}): ApiPathCheck => {
  const key = route_key(method, path_template)
  if (!KNOWN_ROUTES.has(key)) return { ok: false, reason: `not an API route: ${key}` }
  if (DEDICATED_ROUTES.has(key)) return { ok: false, reason: `route has a dedicated channel: ${key}` }

  const names = [...path_template.matchAll(/\{([a-z_]+)\}/g)].map((match) => match[1] as string)
  const extra = Object.keys(params).filter((name) => !names.includes(name))
  if (extra.length > 0) return { ok: false, reason: `unexpected path parameter: ${extra.join(', ')}` }
  let path = path_template
  for (const name of names) {
    const value = params[name]
    if (typeof value !== 'string' || value === '') return { ok: false, reason: `missing path parameter: ${name}` }
    // `.` and `..` survive encodeURIComponent, and URL parsing would then
    // resolve them as dot segments onto another route.
    if (DOT_SEGMENTS.has(value)) return { ok: false, reason: `invalid path parameter: ${name}` }
    path = path.replace(`{${name}}`, encodeURIComponent(value))
  }

  // encodeURIComponent, not URLSearchParams: the node's validator rejects
  // the `+` that URLSearchParams writes for a space.
  const search: string[] = []
  for (const [name, value] of Object.entries(query)) {
    if (value === undefined) continue
    if (!QUERY_KEY.test(name)) return { ok: false, reason: `invalid query parameter: ${name}` }
    for (const item of Array.isArray(value) ? value : [value]) {
      if (!['string', 'number', 'boolean'].includes(typeof item)) return { ok: false, reason: `invalid value for query parameter: ${name}` }
      search.push(`${name}=${encodeURIComponent(String(item))}`)
    }
  }
  const query_string = search.join('&')
  return { ok: true, path: `/api${path}${query_string === '' ? '' : `?${query_string}`}` }
}
