// The surface the preload exposes to the renderer as `window.record`, and the
// values that cross IPC. Every function here is re-validated in main.

import type { API_ROUTES } from './api-routes.ts'
import type { HibernationSnapshot, SnapshotInfo } from './snapshot.ts'

export type ConnectionMode = 'bundled' | 'remote'

// The update channel (spec §8.2.5): stable, or beta, which also takes beta
// prereleases.
export type UpdateChannel = 'stable' | 'beta'

// The bundled node's network privacy (spec §8.3.5): public, or masked, where
// every connection goes out through the bundled Tor client (§5.6.2).
export type NetworkPrivacy = 'public' | 'masked'

export interface ConnectionConfig {
  mode: ConnectionMode
  // The remote node's URL; kept while in bundled mode, so switching back
  // offers it again. Null until the user saves one.
  node_url: string | null
}

// The saved config as the renderer sees it, plus the key that names the node
// for the hibernation snapshot and other per-node state: the remote URL, or
// 'bundled' for the bundled node, whose port can change between launches.
export interface ConnectionView extends ConnectionConfig {
  node_key: string | null
  auth: AuthView
}

// Whether main holds a bearer token for the remote node (spec §8.7.3),
// never the token itself (§8.10.7). `rejected` means the node answered 401
// to the saved token, which was deleted, and `required` that it answered
// 401 to a request sent without one; either way nothing is sent to it
// until the user enters a new token. persistent
// is false where tokens are not kept in a Keychain, and so last until quit.
export interface AuthView {
  status: 'none' | 'saved' | 'rejected' | 'required'
  persistent: boolean
}

// What a save sends: the config, plus a new token for the remote node when
// the user entered one. A save without a token keeps the saved one.
export interface ConnectionSave extends ConnectionConfig {
  token?: string
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

// The event connection (spec §8.7.7). `idle` means no node is configured,
// and `unauthorized` that the node refused the token and nothing is sent
// until the user enters a new one; each transition to `open` carries a new
// connection_id, which is the renderer's cue to reconcile.
export interface EventsState {
  status: 'idle' | 'connecting' | 'open' | 'reconnecting' | 'unauthorized' | 'closed'
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
  // The privacy the node was last launched with (spec §8.3.5).
  network_privacy: NetworkPrivacy
  // The node and identity the data directory holds, once it has answered.
  node_key_pin: { peer_id: string, identity_address: string | null } | null
  // When the running node last came up, for its uptime.
  started_at_ms: number | null
}

// The diagnostics surface (spec §8.9.1), as main collects it.
export interface Diagnostics {
  app_version: string
  electron_version: string
  chrome_version: string
  node_version: string
  platform: string
  mode: ConnectionMode
  node_url: string | null
  node_key: string | null
  user_data: string
  logs_dir: string
  bundled: BundledState
  // Spec §8.2.5; off until a release feed exists. channel is the one the
  // service checks, as the user last chose it.
  updates: { status: string, detail: string | null, channel: UpdateChannel }
  memory: {
    main_rss_bytes: number
    total_working_set_bytes: number
    processes: Array<{ type: string, pid: number, working_set_bytes: number }>
  }
}

export interface ImportAck {
  import_id: string
  file_count?: number
}

export interface ImportTarget {
  library_address: string
  capability_id?: string
}

export interface RecordBridge {
  connection: {
    get: () => Promise<ConnectionView>
    save: (config: ConnectionSave) => Promise<NodeResult<ConnectionView>>
    // Tests the entered config; with no token, the remote node's saved one.
    test: (config: ConnectionSave) => Promise<NodeResult<ConnectionTest>>
    // Deletes the remote node's saved token (spec §8.7.3).
    logout: () => Promise<NodeResult<ConnectionView>>
    // The view again whenever its node key changes, as when the bundled
    // node first answers or its identity changes.
    on_view: (listener: (view: ConnectionView) => void) => () => void
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
    // Opens main's file picker; null when the user cancels. target names
    // the library to ingest into (chapter 7 write targets).
    choose_files: (input: { target?: ImportTarget }) => Promise<NodeResult<ImportAck | null>>
    // Files the user dropped, as their bytes and bare names, never paths.
    upload_files: (input: { files: Array<{ name: string, data: ArrayBuffer }>, target?: ImportTarget }) => Promise<NodeResult<ImportAck>>
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
    restart: () => Promise<NodeResult<null>>
    open_data_dir: () => Promise<void>
    open_log: () => Promise<void>
    // Main's folder picker and confirmation, then a restart there; the new
    // path, or null when the user cancels.
    choose_data_dir: () => Promise<NodeResult<string | null>>
    // Saves the network privacy (spec §8.3.5) and restarts the bundled node
    // under it; the state's network_privacy follows once it has relaunched.
    set_network_privacy: (privacy: NetworkPrivacy) => Promise<NodeResult<NetworkPrivacy>>
  }
  diagnostics: {
    get: () => Promise<Diagnostics>
  }
  updates: {
    // The update channel (spec §8.2.5) the app checks. Read-side is the
    // Diagnostics payload (the poll carries it), so this changes it.
    set_channel: (channel: UpdateChannel) => Promise<NodeResult<UpdateChannel>>
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
  connection_view: 'record:connection:view',
  connection_logout: 'record:connection:logout',
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
  bundled_choose_data_dir: 'record:bundled:choose-data-dir',
  bundled_set_network_privacy: 'record:bundled:set-network-privacy',
  diagnostics_get: 'record:diagnostics:get',
  updates_set_channel: 'record:updates:set-channel',
  snapshot_load: 'record:snapshot:load',
  snapshot_update: 'record:snapshot:update',
  snapshot_get_info: 'record:snapshot:get-info',
  snapshot_set_budget: 'record:snapshot:set-budget',
  snapshot_reset: 'record:snapshot:reset'
} as const
