// The one WebSocket to the node's /api/ws (spec §8.7.7), held by the main
// process with the built-in WebSocket, which sends no Origin header. It
// reconnects with exponential backoff from 1 s to 30 s with jitter, and
// reports its state so the renderer can show it and reconcile on reconnect.
// Imports nothing from Electron, so the integration tests drive it directly.

import type { EventsState, NodeEventMessage } from '#shared/bridge.ts'

export const RECONNECT_MIN_MS = 1_000
export const RECONNECT_MAX_MS = 30_000
// A message larger than this is dropped rather than parsed and forwarded.
const MAX_MESSAGE_CHARS = 1_000_000

// attempt 0 is the first retry after a failure: 1 s, then doubling to the
// 30 s cap, each scaled by a random factor in [0.75, 1.25) and kept in range.
export const reconnect_delay_ms = ({ attempt, random = Math.random }: { attempt: number, random?: () => number }): number => {
  const base = Math.min(RECONNECT_MAX_MS, RECONNECT_MIN_MS * 2 ** attempt)
  return Math.round(Math.min(RECONNECT_MAX_MS, Math.max(RECONNECT_MIN_MS, base * (0.75 + random() * 0.5))))
}

export const events_url = (node_url: string): string => `${node_url.replace(/^http/, 'ws')}/api/ws`

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
  close: () => void
}

export const open_node_events = ({
  node_url,
  on_event,
  on_state,
  create_socket = (url) => new WebSocket(url),
  delay_ms = (attempt) => reconnect_delay_ms({ attempt }),
  now = Date.now
}: {
  node_url: string
  on_event: (message: NodeEventMessage) => void
  on_state: (state: EventsState) => void
  create_socket?: (url: string) => WebSocket
  delay_ms?: (attempt: number) => number
  now?: () => number
}): NodeEvents => {
  let state: EventsState = { status: 'connecting', node_url, connection_id: 0, attempt: 0, retry_at_ms: null, last_error: null }
  let socket: WebSocket | null = null
  let retry_timer: ReturnType<typeof setTimeout> | null = null
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

  function connect (): void {
    retry_timer = null
    if (closed) return
    if (state.status !== 'connecting') set_state({ status: 'connecting', retry_at_ms: null })
    let failure = 'The event connection closed.'
    let current: WebSocket
    try {
      current = create_socket(events_url(node_url))
    } catch (error) {
      schedule_retry(`Cannot open the event connection: ${String(error)}`)
      return
    }
    socket = current
    current.onopen = () => {
      if (socket !== current) return
      // A new connection_id tells the renderer to reconcile (spec §8.7.7).
      set_state({ status: 'open', connection_id: state.connection_id + 1, attempt: 0, retry_at_ms: null, last_error: null })
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
    close: () => {
      closed = true
      if (retry_timer !== null) clearTimeout(retry_timer)
      retry_timer = null
      const current = socket
      socket = null
      current?.close()
      set_state({ status: 'closed', retry_at_ms: null })
    }
  }
}
