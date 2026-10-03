// The surface the preload exposes to the renderer as `window.record`, and the
// values that cross IPC. Every function here is re-validated in main.

import type { API_ROUTES } from './api-routes.ts'

export type ConnectionMode = 'bundled' | 'remote'

export interface ConnectionConfig {
  mode: ConnectionMode
  // Null until the user saves one; the app opens on connection settings.
  node_url: string | null
}

export type ApiRoute = typeof API_ROUTES[number]
export type ApiMethod = ApiRoute['method']
export type ApiPathTemplate = ApiRoute['path_template']

export type QueryValue = string | number | boolean
export type RequestQuery = Record<string, QueryValue | readonly QueryValue[] | undefined>

export interface NodeRequest {
  method: ApiMethod
  path_template: ApiPathTemplate
  params?: Record<string, string>
  query?: RequestQuery
  body?: unknown
}

// Why a call to the node did not produce a response body, in the categories
// spec §8.3.5 asks the connection test to distinguish.
export type NodeFailure =
  | { kind: 'not_configured', message: string }
  | { kind: 'refused', message: string }
  | { kind: 'network', message: string }
  | { kind: 'tls', message: string }
  | { kind: 'auth', status: number, message: string }
  | { kind: 'http', status: number, code: string | null, message: string }
  | { kind: 'too_large', message: string }

export type NodeResult<T> = { ok: true, data: T } | { ok: false, failure: NodeFailure }

export interface ConnectionTest {
  peer_id: string
  version: string | null
}

export interface RecordBridge {
  connection: {
    get: () => Promise<ConnectionConfig>
    save: (config: ConnectionConfig) => Promise<NodeResult<ConnectionConfig>>
    test: (config: ConnectionConfig) => Promise<NodeResult<ConnectionTest>>
  }
  request: (request: NodeRequest) => Promise<NodeResult<unknown>>
  get_audio: (input: { cid: string }) => Promise<NodeResult<ArrayBuffer>>
}

export const IPC_CHANNELS = {
  connection_get: 'record:connection:get',
  connection_save: 'record:connection:save',
  connection_test: 'record:connection:test',
  request: 'record:request',
  get_audio: 'record:get-audio'
} as const
