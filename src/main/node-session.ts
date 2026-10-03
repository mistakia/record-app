// What main holds for the configured node beyond single requests: the event
// connection, restarted whenever the connection settings are saved, with
// its events and state broadcast to the renderer. Imports nothing from
// Electron; index.ts supplies the broadcast.

import { IPC_CHANNELS, type EventsState, type NodeEventMessage } from '#shared/bridge.ts'
import { test_connection } from './node-client.ts'
import { open_node_events, type NodeEvents } from './node-events.ts'

const idle_state: EventsState = { status: 'idle', node_url: null, connection_id: 0, attempt: 0, retry_at_ms: null, last_error: null }

// The node the session talks to, with the remote node's bearer token.
// blocked means the node refused that token: the session opens nothing.
export interface NodeTarget {
  node_url: string
  token: string | null
  blocked: boolean
}

export interface NodeSession {
  start: (target: NodeTarget | null) => void
  get_state: () => EventsState
  reconnect_now: () => void
  force_reconnect: (reason: string) => void
  stop: () => void
}

// Out of reach only on a transport failure; an HTTP error still means the
// node is answering. A 401 is reported, since the WebSocket upgrade cannot
// say why it was refused.
const probe_node = ({ node_url, token, on_unauthorized, check = test_connection }: {
  node_url: string
  token: string | null
  on_unauthorized: (target: { node_url: string, token: string | null }) => void
  check?: typeof test_connection
}) => async (): Promise<boolean> => {
  const result = await check({ node_url, token })
  if (!result.ok && result.failure.kind === 'auth') on_unauthorized({ node_url, token })
  return result.ok || (result.failure.kind !== 'network' && result.failure.kind !== 'tls')
}

export const create_node_session = ({ broadcast, on_unauthorized = () => {}, open_events = open_node_events, check = test_connection }: {
  broadcast: (channel: string, payload: EventsState | NodeEventMessage) => void
  // The node answered 401 to the token the session sent.
  on_unauthorized?: (target: { node_url: string, token: string | null }) => void
  open_events?: typeof open_node_events
  check?: typeof test_connection
}): NodeSession => {
  let events: NodeEvents | null = null
  // connection_id keeps rising across restarts, so the renderer never
  // mistakes a new connection for one it already reconciled.
  let connection_offset = 0
  // Bumped on every start, so a replaced connection's late callbacks are dropped.
  let generation = 0
  // Set while the node has refused the token, so nothing is opened.
  let unauthorized_url: string | null = null
  const unauthorized_state = (node_url: string): EventsState =>
    ({ status: 'unauthorized', node_url, connection_id: connection_offset, attempt: 0, retry_at_ms: null, last_error: 'The node needs a valid access token.' })

  const stop = (): void => {
    generation++
    if (events === null) return
    connection_offset += events.get_state().connection_id
    const closing = events
    events = null
    closing.close()
  }

  return {
    start: (target) => {
      stop()
      if (target === null) {
        unauthorized_url = null
        broadcast(IPC_CHANNELS.events_state, idle_state)
        return
      }
      const { node_url, token } = target
      if (target.blocked) {
        unauthorized_url = node_url
        broadcast(IPC_CHANNELS.events_state, unauthorized_state(node_url))
        return
      }
      unauthorized_url = null
      const offset = connection_offset
      const started = ++generation
      const probe = probe_node({ node_url, token, on_unauthorized, check })
      events = open_events({
        node_url,
        token,
        probe,
        on_event: (message) => {
          if (started === generation) broadcast(IPC_CHANNELS.events_message, message)
        },
        on_state: (state) => {
          if (started !== generation) return
          broadcast(IPC_CHANNELS.events_state, { ...state, connection_id: state.connection_id + offset })
          // A refused upgrade looks like any other failure, so ask over REST
          // whether the token was the reason.
          if (state.status === 'reconnecting') probe().catch(() => {})
        }
      })
    },
    get_state: () => {
      if (unauthorized_url !== null) return unauthorized_state(unauthorized_url)
      if (events === null) return idle_state
      const state = events.get_state()
      return { ...state, connection_id: state.connection_id + connection_offset }
    },
    reconnect_now: () => { events?.reconnect_now() },
    force_reconnect: (reason) => { events?.force_reconnect(reason) },
    stop
  }
}
