// What main holds for the configured node beyond single requests: the event
// connection, restarted whenever the connection settings are saved, with
// its events and state broadcast to the renderer. Imports nothing from
// Electron; index.ts supplies the broadcast.

import { IPC_CHANNELS, type EventsState, type NodeEventMessage } from '#shared/bridge.ts'
import { test_connection } from './node-client.ts'
import { open_node_events, type NodeEvents } from './node-events.ts'

const idle_state: EventsState = { status: 'idle', node_url: null, connection_id: 0, attempt: 0, retry_at_ms: null, last_error: null }

export interface NodeSession {
  start: (node_url: string | null) => void
  get_state: () => EventsState
  reconnect_now: () => void
  force_reconnect: (reason: string) => void
  stop: () => void
}

// Out of reach only on a transport failure; an HTTP error still means the
// node is answering.
const probe_node = (node_url: string) => async (): Promise<boolean> => {
  const result = await test_connection({ node_url })
  return result.ok || (result.failure.kind !== 'network' && result.failure.kind !== 'tls')
}

export const create_node_session = ({ broadcast, open_events = open_node_events }: {
  broadcast: (channel: string, payload: EventsState | NodeEventMessage) => void
  open_events?: typeof open_node_events
}): NodeSession => {
  let events: NodeEvents | null = null
  // connection_id keeps rising across restarts, so the renderer never
  // mistakes a new connection for one it already reconciled.
  let connection_offset = 0
  // Bumped on every start, so a replaced connection's late callbacks are dropped.
  let generation = 0

  const stop = (): void => {
    generation++
    if (events === null) return
    connection_offset += events.get_state().connection_id
    const closing = events
    events = null
    closing.close()
  }

  return {
    start: (node_url) => {
      stop()
      if (node_url === null) {
        broadcast(IPC_CHANNELS.events_state, idle_state)
        return
      }
      const offset = connection_offset
      const started = ++generation
      events = open_events({
        node_url,
        probe: probe_node(node_url),
        on_event: (message) => {
          if (started === generation) broadcast(IPC_CHANNELS.events_message, message)
        },
        on_state: (state) => {
          if (started !== generation) return
          broadcast(IPC_CHANNELS.events_state, { ...state, connection_id: state.connection_id + offset })
        }
      })
    },
    get_state: () => {
      if (events === null) return idle_state
      const state = events.get_state()
      return { ...state, connection_id: state.connection_id + connection_offset }
    },
    reconnect_now: () => { events?.reconnect_now() },
    force_reconnect: (reason) => { events?.force_reconnect(reason) },
    stop
  }
}
