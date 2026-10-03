// The surface the preload exposes to the renderer as `window.record`, and the
// values that cross IPC. Every function here is re-validated in main.

import type { API_ROUTES } from './api-routes.ts'
import type { HibernationSnapshot, SnapshotInfo } from './snapshot.ts'

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

// The event connection (spec §8.7.7). `idle` means no node is configured;
// each transition to `open` carries a new connection_id, which is the
// renderer's cue to reconcile.
export interface EventsState {
  status: 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed'
  node_url: string | null
  connection_id: number
  attempt: number
  retry_at_ms: number | null
  last_error: string | null
}

// One node event, `{ type, payload }`, forwarded as the node sent it.
export interface NodeEventMessage {
  type: string
  payload: Record<string, unknown>
}

export interface RecordBridge {
  connection: {
    get: () => Promise<ConnectionConfig>
    save: (config: ConnectionConfig) => Promise<NodeResult<ConnectionConfig>>
    test: (config: ConnectionConfig) => Promise<NodeResult<ConnectionTest>>
  }
  request: (request: NodeRequest) => Promise<NodeResult<unknown>>
  get_audio: (input: { cid: string }) => Promise<NodeResult<ArrayBuffer>>
  events: {
    get_state: () => Promise<EventsState>
    reconnect_now: () => Promise<void>
    // Each returns its unsubscribe function.
    on_event: (listener: (message: NodeEventMessage) => void) => () => void
    on_state: (listener: (state: EventsState) => void) => () => void
  }
  snapshot: {
    // The snapshot for the configured node, or null.
    load: () => Promise<HibernationSnapshot | null>
    // Hands main the current snapshot; main writes it to disk every 30 s
    // when it changed, and on shutdown.
    update: (snapshot: HibernationSnapshot) => Promise<NodeResult<SnapshotInfo>>
    get_info: () => Promise<SnapshotInfo>
    set_budget: (input: { budget_bytes: number }) => Promise<NodeResult<SnapshotInfo>>
    reset: () => Promise<SnapshotInfo>
  }
}

export const IPC_CHANNELS = {
  connection_get: 'record:connection:get',
  connection_save: 'record:connection:save',
  connection_test: 'record:connection:test',
  request: 'record:request',
  get_audio: 'record:get-audio',
  events_get_state: 'record:events:get-state',
  events_reconnect_now: 'record:events:reconnect-now',
  events_message: 'record:events:message',
  events_state: 'record:events:state',
  snapshot_load: 'record:snapshot:load',
  snapshot_update: 'record:snapshot:update',
  snapshot_get_info: 'record:snapshot:get-info',
  snapshot_set_budget: 'record:snapshot:set-budget',
  snapshot_reset: 'record:snapshot:reset'
} as const
