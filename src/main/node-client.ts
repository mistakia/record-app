// HTTP client for the node API, run in the main process with Node's built-in
// fetch, which sends no Origin header: a node with `cors_origins: []` refuses
// any request carrying one. Imports nothing from Electron, so the integration
// tests drive it directly.

import type { ConnectionTest, NodeFailure, NodeRequest, NodeResult } from '#shared/bridge.ts'
import { build_api_path } from './api-path.ts'

const REQUEST_TIMEOUT_MS = 15_000
const AUDIO_TIMEOUT_MS = 120_000
const TEST_TIMEOUT_MS = 5_000
// Uploading is bounded by the size of the files, so this is generous.
const IMPORT_TIMEOUT_MS = 30 * 60_000
// The whole file crosses IPC and is decoded in memory, so refuse anything
// larger rather than exhaust either process.
export const MAX_AUDIO_BYTES = 1024 ** 3

const TLS_ERROR_CODE = /CERT|TLS|SSL/
const BUN_ERROR_CODES: Record<string, string> = { ConnectionRefused: 'ECONNREFUSED' }

const describe_fetch_error = (error: unknown): NodeFailure => {
  if (error instanceof Error && error.name === 'TimeoutError') return { kind: 'network', message: 'The node did not respond in time.', code: 'TIMEOUT' }
  if (error instanceof Error && error.name === 'AbortError') return { kind: 'aborted', message: 'The request was cancelled.' }
  const cause = error instanceof Error ? error.cause as { code?: unknown, message?: unknown } | undefined : undefined
  // Node's fetch puts the system code on the cause; Bun's (the tests) puts
  // its own name for it on the error.
  const own_code = (error as { code?: unknown } | null)?.code
  const raw_code = typeof cause?.code === 'string' ? cause.code : typeof own_code === 'string' ? own_code : null
  const code = raw_code === null ? null : BUN_ERROR_CODES[raw_code] ?? raw_code
  const detail = typeof cause?.message === 'string' ? cause.message : String(error)
  if (code !== null && TLS_ERROR_CODE.test(code)) return { kind: 'tls', message: `TLS error: ${detail}` }
  return { kind: 'network', message: code === null ? `Network error: ${detail}` : `Network error (${code}): ${detail}`, code }
}

const describe_http_error = async (response: Response): Promise<NodeFailure> => {
  let code: string | null = null
  let message = `The node answered HTTP ${response.status}.`
  try {
    const body = await response.json() as { error?: { code?: unknown, message?: unknown } }
    if (typeof body.error?.code === 'string') code = body.error.code
    if (typeof body.error?.message === 'string') message = `HTTP ${response.status}: ${body.error.message}`
  } catch {}
  if (response.status === 401) return { kind: 'auth', status: response.status, message }
  return { kind: 'http', status: response.status, code, message }
}

const fetch_node = async ({ url, init, timeout_ms, signal }: {
  url: string
  init: RequestInit
  timeout_ms: number
  signal?: AbortSignal | undefined
}): Promise<NodeResult<Response>> => {
  try {
    // A redirect could point anywhere; the node never issues one.
    const timeout = AbortSignal.timeout(timeout_ms)
    const response = await fetch(url, { ...init, redirect: 'error', signal: signal === undefined ? timeout : AbortSignal.any([timeout, signal]) })
    if (!response.ok) return { ok: false, failure: await describe_http_error(response) }
    return { ok: true, data: response }
  } catch (error) {
    return { ok: false, failure: describe_fetch_error(error) }
  }
}

const not_configured: NodeResult<never> = { ok: false, failure: { kind: 'not_configured', message: 'No node URL is configured.' } }

// A remote node's bearer token (spec §8.7.3); the bundled node takes none.
const auth_headers = (token: string | null | undefined): Record<string, string> =>
  token === null || token === undefined ? {} : { authorization: `Bearer ${token}` }

export const request_node = async ({ node_url, token, request }: {
  node_url: string | null
  token?: string | null | undefined
  request: NodeRequest
}): Promise<NodeResult<unknown>> => {
  if (node_url === null) return not_configured
  const path = build_api_path(request)
  if (!path.ok) return { ok: false, failure: { kind: 'refused', message: path.reason } }
  const has_body = request.body !== undefined
  const result = await fetch_node({
    url: `${node_url}${path.path}`,
    init: {
      method: request.method.toUpperCase(),
      headers: { accept: 'application/json', ...(has_body ? { 'content-type': 'application/json' } : {}), ...auth_headers(token) },
      ...(has_body ? { body: JSON.stringify(request.body) } : {})
    },
    timeout_ms: REQUEST_TIMEOUT_MS
  })
  if (!result.ok) return result
  const text = await result.data.text()
  if (text === '') return { ok: true, data: null }
  try {
    return { ok: true, data: JSON.parse(text) as unknown }
  } catch {
    return { ok: false, failure: { kind: 'http', status: result.data.status, code: null, message: 'The node returned a response that is not JSON.' } }
  }
}

const too_large = (max_bytes: number): NodeResult<never> =>
  ({ ok: false, failure: { kind: 'too_large', message: `The audio file is larger than the ${max_bytes}-byte limit.` } })

// Reads the body into one buffer, giving up as soon as it passes max_bytes,
// whatever Content-Length claimed.
const read_capped = async ({ response, max_bytes }: { response: Response, max_bytes: number }): Promise<NodeResult<ArrayBuffer>> => {
  const declared = Number(response.headers.get('content-length') ?? Number.NaN)
  if (declared > max_bytes) {
    await response.body?.cancel()
    return too_large(max_bytes)
  }
  const chunks: Uint8Array[] = []
  let total = 0
  if (response.body !== null) {
    for await (const chunk of response.body) {
      total += chunk.byteLength
      if (total > max_bytes) {
        await response.body.cancel().catch(() => {})
        return too_large(max_bytes)
      }
      chunks.push(chunk)
    }
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { ok: true, data: bytes.buffer }
}

// The whole audio blob, which the renderer decodes with decodeAudioData.
// signal cancels the download, as when the track it was pre-buffering for is
// no longer next.
export const get_audio = async ({ node_url, token, cid, max_bytes = MAX_AUDIO_BYTES, signal }: {
  node_url: string | null
  token?: string | null | undefined
  cid: string
  max_bytes?: number
  signal?: AbortSignal
}): Promise<NodeResult<ArrayBuffer>> => {
  if (node_url === null) return not_configured
  const result = await fetch_node({ url: `${node_url}/api/audio/${encodeURIComponent(cid)}`, init: { method: 'GET', headers: auth_headers(token) }, timeout_ms: AUDIO_TIMEOUT_MS, signal })
  if (!result.ok) return result
  try {
    return await read_capped({ response: result.data, max_bytes })
  } catch (error) {
    return { ok: false, failure: describe_fetch_error(error) }
  }
}

// Spec §8.3.5: GET /settings against a candidate node, reporting its peer_id
// or the specific failure.
export const test_connection = async ({ node_url, token }: { node_url: string, token?: string | null | undefined }): Promise<NodeResult<ConnectionTest>> => {
  const result = await fetch_node({ url: `${node_url}/api/settings`, init: { method: 'GET', headers: { accept: 'application/json', ...auth_headers(token) } }, timeout_ms: TEST_TIMEOUT_MS })
  if (!result.ok) return result
  try {
    const settings = await result.data.json() as { peer_id?: unknown, version?: unknown }
    if (typeof settings.peer_id !== 'string') throw new Error('no peer_id')
    return { ok: true, data: { peer_id: settings.peer_id, version: typeof settings.version === 'string' ? settings.version : null } }
  } catch {
    return { ok: false, failure: { kind: 'http', status: result.data.status, code: null, message: 'The URL answered, but not as a record-node: GET /api/settings returned no peer_id.' } }
  }
}

export interface ImportAck {
  import_id: string
  file_count?: number
}

// POST /api/import/file as multipart `files` parts. Each file's name only
// tells the node the container by its extension; progress arrives as
// import:* events.
export const import_files = async ({ node_url, token, files }: {
  node_url: string | null
  token?: string | null | undefined
  files: Array<{ name: string, blob: Blob }>
}): Promise<NodeResult<ImportAck>> => {
  if (node_url === null) return not_configured
  const form = new FormData()
  for (const { name, blob } of files) form.append('files', blob, name)
  const result = await fetch_node({ url: `${node_url}/api/import/file`, init: { method: 'POST', body: form, headers: { accept: 'application/json', ...auth_headers(token) } }, timeout_ms: IMPORT_TIMEOUT_MS })
  if (!result.ok) return result
  try {
    const ack = await result.data.json() as { import_id?: unknown, file_count?: unknown }
    if (typeof ack.import_id !== 'string') throw new Error('no import_id')
    return { ok: true, data: { import_id: ack.import_id, ...(typeof ack.file_count === 'number' ? { file_count: ack.file_count } : {}) } }
  } catch {
    return { ok: false, failure: { kind: 'http', status: result.data.status, code: null, message: 'The node accepted the upload but returned no import id.' } }
  }
}
