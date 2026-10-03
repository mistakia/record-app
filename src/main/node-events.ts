// The one WebSocket to the node's /api/ws (spec §8.7.7), held by the main
// process with the built-in WebSocket, which sends no Origin header. It
// reconnects with exponential backoff from 1 s to 30 s with jitter, and
// reports its state so the renderer can show it and reconcile on reconnect.
// The node sends no pings and the built-in WebSocket cannot send one, so
// while open a cheap probe runs every 15 s; a failed probe treats the socket
// as dead (a half-open socket after sleep, a network change, or a tunnel
// that died silently) and reconnects.
// Imports nothing from Electron, so the integration tests drive it directly.

import type { EventsState, NodeEventMessage } from '#shared/bridge.ts'

export const RECONNECT_MIN_MS = 1_000
export const RECONNECT_MAX_MS = 30_000
export const PROBE_INTERVAL_MS = 15_000
// A message larger than this is dropped rather than parsed and forwarded.
const MAX_MESSAGE_CHARS = 1_000_000

// attempt 0 is the first retry after a failure: 1 s, then doubling to the
// 30 s cap, each scaled by a random factor in [0.75, 1.25) and kept in range.
export const reconnect_delay_ms = ({ attempt, random = Math.random }: { attempt: number, random?: () => number }): number => {
  const base = Math.min(RECONNECT_MAX_MS, RECONNECT_MIN_MS * 2 ** attempt)
  return Math.round(Math.min(RECONNECT_MAX_MS, Math.max(RECONNECT_MIN_MS, base * (0.75 + random() * 0.5))))
}

export const events_url = (node_url: string): string => `${node_url.replace(/^http/, 'ws')}/api/ws`

// A remote node's token rides in the bearer.<token> subprotocol, offered
// beside record, which the node selects so the token is never echoed back;
// never in the query string, which HTTP infrastructure logs (§8.7.7).
export const events_protocols = (token: string | null | undefined): string[] =>
  token === null || token === undefined ? [] : ['record', `bearer.${token}`]

// The node's messages are `{ type, payload }` JSON (x-websocket-events);
// anything else is dropped.
export const parse_event_message = (data: unknown): NodeEventMessage | null => {
  if (typeof data !== 'string' || data.length > MAX_MESSAGE_CHARS) return null
  try {
    const message = JSON.parse(data) as { type?: unknown, payload?: unknown }
    if (typeof message.type !== 'string' || typeof message.payload !== 'object' || message.payload === null) return null
    return { type: message.type, payload: message.payload as Record<string, unknown> }
  } catch {
    return null
  }
}

export interface NodeEvents {
  get_state: () => EventsState
  // Skips the remaining backoff wait and dials now.
  reconnect_now: () => void
  // Drops the socket, even one that looks open, and dials again at once, as
  // after the machine wakes from sleep.
  force_reconnect: (reason: string) => void
  close: () => void
}

export const open_node_events = ({
  node_url,
  token,
  on_event,
  on_state,
  create_socket = (url, protocols) => new WebSocket(url, protocols),
  delay_ms = (attempt) => reconnect_delay_ms({ attempt }),
  probe,
  probe_interval_ms = PROBE_INTERVAL_MS,
  now = Date.now
}: {
  node_url: string
  token?: string | null | undefined
  on_event: (message: NodeEventMessage) => void
  on_state: (state: EventsState) => void
  create_socket?: (url: string, protocols: string[]) => WebSocket
  delay_ms?: (attempt: number) => number
  // Resolves false when the node is out of reach.
  probe?: () => Promise<boolean>
  probe_interval_ms?: number
  now?: () => number
}): NodeEvents => {
  let state: EventsState = { status: 'connecting', node_url, connection_id: 0, attempt: 0, retry_at_ms: null, last_error: null }
  let socket: WebSocket | null = null
  let retry_timer: ReturnType<typeof setTimeout> | null = null
  let probe_timer: ReturnType<typeof setInterval> | null = null
  let closed = false

  const set_state = (patch: Partial<EventsState>): void => {
    state = { ...state, ...patch }
    on_state(state)
  }

  const schedule_retry = (error: string): void => {
    if (closed) return
    const delay = delay_ms(state.attempt)
    set_state({ status: 'reconnecting', attempt: state.attempt + 1, retry_at_ms: now() + delay, last_error: error })
    retry_timer = setTimeout(connect, delay)
  }

  const stop_probe = (): void => {
    if (probe_timer !== null) clearInterval(probe_timer)
    probe_timer = null
  }

  // Abandons the current socket without waiting for its close handshake,
  // which a dead peer never completes.
  const drop_socket = (): void => {
    stop_probe()
    const current = socket
    socket = null
    if (current === null) return
    current.onopen = null
    current.onmessage = null
    current.onerror = null
    current.onclose = null
    try {
      current.close()
    } catch {}
  }

  const start_probe = (current: WebSocket): void => {
    stop_probe()
    if (probe === undefined) return
    let probing = false
    probe_timer = setInterval(() => {
      if (probing || socket !== current) return
      probing = true
      probe()
        .catch(() => false)
        .then((alive) => {
          probing = false
          if (alive || socket !== current || closed) return
          drop_socket()
          schedule_retry('The node stopped answering.')
        })
        .catch(() => {})
    }, probe_interval_ms)
  }

  function connect (): void {
    retry_timer = null
    if (closed) return
    if (state.status !== 'connecting') set_state({ status: 'connecting', retry_at_ms: null })
    let failure = 'The event connection closed.'
    let current: WebSocket
    try {
      current = create_socket(events_url(node_url), events_protocols(token))
    } catch (error) {
      schedule_retry(`Cannot open the event connection: ${String(error)}`)
      return
    }
    socket = current
    current.onopen = () => {
      if (socket !== current) return
      // A new connection_id tells the renderer to reconcile (spec §8.7.7).
      set_state({ status: 'open', connection_id: state.connection_id + 1, attempt: 0, retry_at_ms: null, last_error: null })
      start_probe(current)
    }
    current.onmessage = (event) => {
      if (socket !== current) return
      const message = parse_event_message(event.data)
      if (message !== null) on_event(message)
    }
    current.onerror = (event) => {
      const detail = (event as { message?: unknown }).message
      if (typeof detail === 'string' && detail !== '') failure = detail
    }
    current.onclose = (event) => {
      if (socket !== current) return
      stop_probe()
      socket = null
      schedule_retry(event.code === 1000 || event.code === 1005 ? failure : `${failure} (close code ${event.code})`)
    }
  }

  // Report `connecting` at once, so a node switch never leaves the renderer
  // believing the previous connection is still open.
  on_state(state)
  connect()

  return {
    get_state: () => state,
    reconnect_now: () => {
      if (closed || state.status !== 'reconnecting' || retry_timer === null) return
      clearTimeout(retry_timer)
      connect()
    },
    force_reconnect: (reason) => {
      if (closed) return
      if (retry_timer !== null) clearTimeout(retry_timer)
      retry_timer = null
      drop_socket()
      set_state({ status: 'connecting', attempt: 0, retry_at_ms: null, last_error: reason })
      connect()
    },
    close: () => {
      closed = true
      if (retry_timer !== null) clearTimeout(retry_timer)
      retry_timer = null
      drop_socket()
      set_state({ status: 'closed', retry_at_ms: null })
    }
  }
}
