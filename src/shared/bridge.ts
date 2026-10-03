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
  // code is the system error code (ECONNREFUSED, ENOTFOUND, ...), or
  // TIMEOUT, or null when there is none.
  | { kind: 'network', message: string, code: string | null }
  | { kind: 'tls', message: string }
  | { kind: 'auth', status: number, message: string }
  | { kind: 'http', status: number, code: string | null, message: string }
  | { kind: 'too_large', message: string }
  | { kind: 'aborted', message: string }
  | { kind: 'busy', message: string }

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

// The bundled node (spec §8.4), as main manages it.
export interface BundledState {
  status: 'stopped' | 'starting' | 'running' | 'restarting' | 'failed'
  // Set while the node answers its health check.
  url: string | null
  port: number | null
  pid: number | null
  data_dir: string
  log_path: string
  // The pinned record-node version (spec §8.2.7).
  version: string
  // Restarts in a row that have not stayed up; auto-restart stops past five.
  failed_restarts: number
  retry_at_ms: number | null
  error: string | null
  stderr_tail: string | null
  // Why ingest is off (the pinned ffmpeg and fpcalc are not bundled yet).
  ingest_disabled: string | null
}

export interface ImportAck {
  import_id: string
  file_count?: number
}

export interface RecordBridge {
  connection: {
    get: () => Promise<ConnectionConfig>
    save: (config: ConnectionConfig) => Promise<NodeResult<ConnectionConfig>>
    test: (config: ConnectionConfig) => Promise<NodeResult<ConnectionTest>>
  }
  request: (request: NodeRequest) => Promise<NodeResult<unknown>>
  // request_id names the download so cancel_audio can abort it.
  get_audio: (input: { cid: string, request_id: string }) => Promise<NodeResult<ArrayBuffer>>
  cancel_audio: (input: { request_id: string }) => Promise<void>
  events: {
    get_state: () => Promise<EventsState>
    reconnect_now: () => Promise<void>
    // Each returns its unsubscribe function.
    on_event: (listener: (message: NodeEventMessage) => void) => () => void
    on_state: (listener: (state: EventsState) => void) => () => void
  }
  import: {
    // Opens main's file picker; null when the user cancels.
    choose_files: () => Promise<NodeResult<ImportAck | null>>
    // Files the user dropped, as their bytes and bare names, never paths.
    upload_files: (files: Array<{ name: string, data: ArrayBuffer }>) => Promise<NodeResult<ImportAck>>
  }
  identity: {
    // The key pair, after the user confirms in main's native dialog. The
    // generic request refuses the identity routes.
    export: () => Promise<NodeResult<{ public_key: string, private_key: string }>>
    // Bundled node only (spec §8.5.4).
    import: (input: { private_key: string }) => Promise<NodeResult<unknown>>
    // Copies the exported key; main clears the clipboard after a minute if
    // it still holds exactly that text.
    copy_key: (input: { text: string }) => Promise<NodeResult<{ clears_in_ms: number }>>
    // The node's public key alone. Chapter 7 serves it only with the private
    // key (GET /identity/export), so main reads it and keeps only this half.
    public_key: () => Promise<NodeResult<{ public_key: string }>>
  }
  bundled: {
    get_state: () => Promise<BundledState>
    on_state: (listener: (state: BundledState) => void) => () => void
    // A manual restart, as after the automatic restarts gave up.
    restart: () => Promise<void>
    open_data_dir: () => Promise<void>
    open_log: () => Promise<void>
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
  cancel_audio: 'record:cancel-audio',
  events_get_state: 'record:events:get-state',
  events_reconnect_now: 'record:events:reconnect-now',
  events_message: 'record:events:message',
  events_state: 'record:events:state',
  import_choose_files: 'record:import:choose-files',
  import_upload_files: 'record:import:upload-files',
  identity_public_key: 'record:identity:public-key',
  identity_export: 'record:identity:export',
  identity_import: 'record:identity:import',
  identity_copy_key: 'record:identity:copy-key',
  bundled_get_state: 'record:bundled:get-state',
  bundled_state: 'record:bundled:state',
  bundled_restart: 'record:bundled:restart',
  bundled_open_data_dir: 'record:bundled:open-data-dir',
  bundled_open_log: 'record:bundled:open-log',
  snapshot_load: 'record:snapshot:load',
  snapshot_update: 'record:snapshot:update',
  snapshot_get_info: 'record:snapshot:get-info',
  snapshot_set_budget: 'record:snapshot:set-budget',
  snapshot_reset: 'record:snapshot:reset'
} as const
