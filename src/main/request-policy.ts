// The generic request channel: any method and path template in the pinned
// yaml (build_api_path), except the identity routes. Those carry the private
// key, so they go only through main's own identity channels, which confirm
// an export with the user in a native dialog and send an import only to the
// bundled node (spec §8.10.1, §8.5.3, §8.5.4). URL import and URL resolve,
// the two routes that run yt-dlp, are refused in bundled mode, which ships no
// yt-dlp. Imports nothing from Electron.

import { API_ROUTES } from '#shared/api-routes.ts'
import type { ConnectionMode, NodeRequest, NodeResult } from '#shared/bridge.ts'
import { URL_IMPORT_OFF_IN_BUNDLED } from '#shared/bundled.ts'
import { request_node } from './node-client.ts'
import { refused_without_target } from './write-target.ts'

const METHODS = new Set<string>(API_ROUTES.map(({ method }) => method))
const IDENTITY_ROUTES = new Set(['get /identity/export', 'post /identity/import'])

const refuse = (message: string): NodeResult<never> => ({ ok: false, failure: { kind: 'refused', message } })

const is_plain_object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// The shape of a NodeRequest; build_api_path then checks the route itself,
// the parameter names, and the query values.
export const check_node_request = (input: unknown): NodeRequest | null => {
  if (!is_plain_object(input)) return null
  const { method, path_template, params, query, body } = input
  if (typeof method !== 'string' || !METHODS.has(method) || typeof path_template !== 'string') return null
  if (params !== undefined && !(is_plain_object(params) && Object.values(params).every((value) => typeof value === 'string'))) return null
  if (query !== undefined && !is_plain_object(query)) return null
  return { method, path_template, params, query, body } as NodeRequest
}

export const refused_on_generic_channel = (request: Pick<NodeRequest, 'method' | 'path_template'>): string | null =>
  IDENTITY_ROUTES.has(`${request.method} ${request.path_template}`)
    ? 'Identity export and import go through their own confirmed actions, not a plain request.'
    : null

const YTDLP_ROUTES = new Set(['post /import/url', 'get /resolve'])

export const refused_in_mode = (request: Pick<NodeRequest, 'method' | 'path_template'>, mode: ConnectionMode): string | null =>
  mode === 'bundled' && YTDLP_ROUTES.has(`${request.method} ${request.path_template}`) ? URL_IMPORT_OFF_IN_BUNDLED : null

export const serve_generic_request = async ({ input, node_url, mode, call = request_node }: {
  input: unknown
  node_url: string | null
  mode: ConnectionMode
  call?: typeof request_node
}): Promise<NodeResult<unknown>> => {
  const request = check_node_request(input)
  if (request === null) return refuse('Malformed node request.')
  const refusal = refused_on_generic_channel(request) ?? refused_in_mode(request, mode) ?? refused_without_target(request)
  if (refusal !== null) return refuse(refusal)
  return await call({ node_url, request })
}
