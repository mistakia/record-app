import { describe, expect, test } from 'bun:test'

import { events_url, open_node_events, parse_event_message, reconnect_delay_ms, RECONNECT_MAX_MS, RECONNECT_MIN_MS } from '#main/node-events.ts'
import { create_node_session } from '#main/node-session.ts'
import { IPC_CHANNELS, type EventsState, type NodeEventMessage } from '#shared/bridge.ts'

interface FakeSocket {
  url: string
  closed: boolean
  onopen: (() => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onerror: ((event: unknown) => void) | null
  onclose: ((event: { code: number }) => void) | null
  close: () => void
}

const create_fake_sockets = () => {
  const sockets: FakeSocket[] = []
  const create_socket = (url: string) => {
    const socket: FakeSocket = {
      url,
      closed: false,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      close: () => { socket.closed = true }
    }
    sockets.push(socket)
    return socket as unknown as WebSocket
  }
  return { sockets, create_socket }
}

const tick = async (ms = 20) => { await new Promise((resolve) => setTimeout(resolve, ms)) }

describe('reconnect_delay_ms', () => {
  test('starts near 1 s, doubles, caps at 30 s, and stays in range at both jitter extremes', () => {
    expect(reconnect_delay_ms({ attempt: 0, random: () => 0.5 })).toBe(1000)
    expect(reconnect_delay_ms({ attempt: 1, random: () => 0.5 })).toBe(2000)
    expect(reconnect_delay_ms({ attempt: 3, random: () => 0.5 })).toBe(8000)
    expect(reconnect_delay_ms({ attempt: 20, random: () => 0.5 })).toBe(30000)
    for (let attempt = 0; attempt < 12; attempt++) {
      for (const random of [() => 0, () => 0.999999]) {
        const delay = reconnect_delay_ms({ attempt, random })
        expect(delay).toBeGreaterThanOrEqual(RECONNECT_MIN_MS)
        expect(delay).toBeLessThanOrEqual(RECONNECT_MAX_MS)
      }
    }
    expect(reconnect_delay_ms({ attempt: 2, random: () => 0 })).toBe(3000)
    expect(reconnect_delay_ms({ attempt: 2, random: () => 0.999999 })).toBe(5000)
  })
})

describe('parse_event_message', () => {
  test('keeps { type, payload } JSON and drops anything else', () => {
    expect(parse_event_message('{"type":"track:added","payload":{"library_address":"/record/a/b"}}'))
      .toEqual({ type: 'track:added', payload: { library_address: '/record/a/b' } })
    for (const data of ['not json', '{"type":1,"payload":{}}', '{"type":"x"}', '{"type":"x","payload":null}', new ArrayBuffer(4), 'x'.repeat(1_000_001)]) {
      expect(parse_event_message(data)).toBeNull()
    }
  })

  test('builds the ws URL from the node URL', () => {
    expect(events_url('http://127.0.0.1:8088')).toBe('ws://127.0.0.1:8088/api/ws')
    expect(events_url('https://node.example.com:443')).toBe('wss://node.example.com:443/api/ws')
  })
})

describe('open_node_events', () => {
  test('opens, forwards events, reconnects with backoff after a drop, and counts connections', async () => {
    const { sockets, create_socket } = create_fake_sockets()
    const states: EventsState[] = []
    const events: NodeEventMessage[] = []
    const delays: number[] = []
    const connection = open_node_events({
      node_url: 'http://127.0.0.1:3000',
      on_event: (message) => { events.push(message) },
      on_state: (state) => { states.push(state) },
      create_socket,
      delay_ms: (attempt) => { delays.push(attempt); return 5 }
    })
    expect(sockets[0]?.url).toBe('ws://127.0.0.1:3000/api/ws')
    sockets[0]?.onopen?.()
    expect(connection.get_state()).toMatchObject({ status: 'open', connection_id: 1, attempt: 0 })
    sockets[0]?.onmessage?.({ data: '{"type":"track:added","payload":{"library_address":"a"}}' })
    sockets[0]?.onmessage?.({ data: 'garbage' })
    expect(events).toEqual([{ type: 'track:added', payload: { library_address: 'a' } }])

    // Two failed dials back off with rising attempts, then a third succeeds.
    sockets[0]?.onclose?.({ code: 1006 })
    expect(connection.get_state()).toMatchObject({ status: 'reconnecting', attempt: 1 })
    await tick()
    sockets[1]?.onclose?.({ code: 1006 })
    await tick()
    sockets[2]?.onopen?.()
    expect(delays).toEqual([0, 1])
    expect(connection.get_state()).toMatchObject({ status: 'open', connection_id: 2, attempt: 0, last_error: null })
    expect(states.map(({ status }) => status)).toEqual(['connecting', 'open', 'reconnecting', 'connecting', 'reconnecting', 'connecting', 'open'])

    connection.close()
    expect(sockets[2]?.closed).toBe(true)
    sockets[2]?.onclose?.({ code: 1000 })
    await tick()
    expect(sockets).toHaveLength(3)
    expect(connection.get_state().status).toBe('closed')
  })

  test('reconnect_now dials immediately instead of waiting out the backoff', async () => {
    const { sockets, create_socket } = create_fake_sockets()
    const connection = open_node_events({ node_url: 'http://127.0.0.1:3000', on_event: () => {}, on_state: () => {}, create_socket, delay_ms: () => 60_000 })
    sockets[0]?.onclose?.({ code: 1006 })
    expect(connection.get_state().status).toBe('reconnecting')
    connection.reconnect_now()
    expect(sockets).toHaveLength(2)
    expect(connection.get_state().status).toBe('connecting')
    connection.close()
  })
})

describe('create_node_session', () => {
  test('restarts on each start, keeps connection_id rising, and drops a replaced connection\'s callbacks', async () => {
    const { sockets, create_socket } = create_fake_sockets()
    const sent: Array<{ channel: string, payload: unknown }> = []
    const session = create_node_session({
      broadcast: (channel, payload) => { sent.push({ channel, payload }) },
      open_events: (options) => open_node_events({ ...options, create_socket, delay_ms: () => 5 })
    })
    session.start('http://127.0.0.1:3000')
    sockets[0]?.onopen?.()
    expect(session.get_state()).toMatchObject({ status: 'open', connection_id: 1 })
    sent.length = 0
    session.start('http://127.0.0.1:3001')
    expect(sockets[0]?.closed).toBe(true)
    // The switch is reported before the new socket opens, never as open.
    const first_new_state = sent.find(({ channel, payload }) => channel === IPC_CHANNELS.events_state && (payload as EventsState).node_url === 'http://127.0.0.1:3001')
    expect(first_new_state?.payload).toMatchObject({ status: 'connecting', connection_id: 1 })
    sockets[0]?.onmessage?.({ data: '{"type":"track:added","payload":{}}' })
    sockets[1]?.onopen?.()
    expect(session.get_state()).toMatchObject({ status: 'open', node_url: 'http://127.0.0.1:3001', connection_id: 2 })
    expect(sent.filter(({ channel }) => channel === IPC_CHANNELS.events_message)).toEqual([])
    session.start(null)
    expect(session.get_state().status).toBe('idle')
    expect(sent.at(-1)).toMatchObject({ channel: IPC_CHANNELS.events_state, payload: { status: 'idle' } })
  })
})
