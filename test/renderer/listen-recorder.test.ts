import { describe, expect, test } from 'bun:test'

import { create_listen_recorder, required_listen_seconds, type CapturedListen, type Listen } from '#renderer/player/listen-recorder.ts'

const LISTEN: Listen = { track_id: 't', library_address: '/record/a/record' }
const settle = async () => { await new Promise((resolve) => setTimeout(resolve, 1)) }
const create_storage = () => {
  const items = new Map<string, string>()
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value) } }
}
const recorder_on = ({ record, get_node_key = () => 'node-a', storage = create_storage(), now = () => 1_000 }: {
  record: (listen: CapturedListen) => Promise<boolean>
  get_node_key?: () => string | null
  storage?: ReturnType<typeof create_storage>
  now?: () => number
}) => {
  let ids = 0
  return create_listen_recorder({ record, get_node_key, storage, now, mint_id: () => `id-${++ids}` })
}

describe('required_listen_seconds', () => {
  test('is 60 s, or within a second of the end for a shorter track', () => {
    expect(required_listen_seconds({ duration_seconds: 300 })).toBe(60)
    expect(required_listen_seconds({ duration_seconds: 51 })).toBe(50)
    expect(required_listen_seconds({ duration_seconds: 0 })).toBe(60)
    expect(required_listen_seconds({ duration_seconds: 0.5 })).toBe(0)
  })
})

describe('listen recorder', () => {
  test('records once per play at the threshold, and again for a new play of the same track', async () => {
    const recorded: Listen[] = []
    const recorder = recorder_on({ record: async (listen) => { recorded.push(listen); return true } })
    for (const played_seconds of [10, 59.9]) recorder.observe({ play_id: 1, played_seconds, duration_seconds: 300, listen: LISTEN })
    expect(recorded).toHaveLength(0)
    for (const played_seconds of [60, 61, 120]) recorder.observe({ play_id: 1, played_seconds, duration_seconds: 300, listen: LISTEN })
    expect(recorded).toHaveLength(1)
    recorder.observe({ play_id: 2, played_seconds: 5, duration_seconds: 300, listen: LISTEN })
    recorder.observe({ play_id: 2, played_seconds: 60, duration_seconds: 300, listen: LISTEN })
    expect(recorded).toHaveLength(2)
  })

  test('ignores plays with no listen attached and play_id 0', () => {
    const recorded: Listen[] = []
    const recorder = recorder_on({ record: async (listen) => { recorded.push(listen); return true } })
    recorder.observe({ play_id: 1, played_seconds: 100, duration_seconds: 300, listen: null })
    recorder.observe({ play_id: 0, played_seconds: 100, duration_seconds: 300, listen: LISTEN })
    expect(recorded).toHaveLength(0)
  })

  test('keeps a listen the node could not take and sends it on flush', async () => {
    let accept = false
    const attempts: Listen[] = []
    const recorder = recorder_on({ record: async (listen) => { attempts.push(listen); return accept } })
    recorder.observe({ play_id: 1, played_seconds: 60, duration_seconds: 300, listen: LISTEN })
    await settle()
    expect(recorder.pending_count()).toBe(1)
    accept = true
    recorder.flush_pending()
    await settle()
    expect(recorder.pending_count()).toBe(0)
    expect(attempts).toHaveLength(2)
    expect(attempts[1]).toEqual(attempts[0] as CapturedListen)
  })

  test('stamps the key and the time when the threshold is crossed, not when sent', async () => {
    let clock = 5_000
    const attempts: CapturedListen[] = []
    let accept = false
    const recorder = recorder_on({ record: async (listen) => { attempts.push(listen); return accept }, now: () => clock })
    recorder.observe({ play_id: 1, played_seconds: 60, duration_seconds: 300, listen: LISTEN })
    await settle()
    clock = 99_000
    accept = true
    recorder.flush_pending()
    await settle()
    expect(attempts).toEqual([
      { ...LISTEN, client_listen_id: 'id-1', listened_at_ms: 5_000 },
      { ...LISTEN, client_listen_id: 'id-1', listened_at_ms: 5_000 }
    ])
  })

  test('a reloaded recorder restores pending listens with their original key and time', async () => {
    const storage = create_storage()
    const before = recorder_on({ record: async () => false, storage, now: () => 7_000 })
    before.observe({ play_id: 1, played_seconds: 60, duration_seconds: 300, listen: LISTEN })
    await settle()
    const sent: CapturedListen[] = []
    const after = recorder_on({ record: async (listen) => { sent.push(listen); return true }, storage, now: () => 8_000 })
    expect(after.pending_count()).toBe(1)
    after.flush_pending()
    await settle()
    expect(sent).toEqual([{ ...LISTEN, client_listen_id: 'id-1', listened_at_ms: 7_000 }])
    expect(after.pending_count()).toBe(0)
  })

  test('a listen is saved before its first attempt, so a restart mid-request keeps it', () => {
    const storage = create_storage()
    const recorder = recorder_on({ record: () => new Promise<boolean>(() => {}), storage })
    recorder.observe({ play_id: 1, played_seconds: 60, duration_seconds: 300, listen: LISTEN })
    expect(recorder_on({ record: async () => true, storage }).pending_count()).toBe(1)
  })

  test('listens pending for one node are not flushed to another', async () => {
    let node_key = 'node-a'
    const sent: CapturedListen[] = []
    let accept = false
    const recorder = recorder_on({ record: async (listen) => { sent.push(listen); return accept }, get_node_key: () => node_key })
    recorder.observe({ play_id: 1, played_seconds: 60, duration_seconds: 300, listen: LISTEN })
    await settle()
    sent.length = 0
    node_key = 'node-b'
    accept = true
    recorder.flush_pending()
    await settle()
    expect(sent).toHaveLength(0)
    expect(recorder.pending_count()).toBe(0)
    node_key = 'node-a'
    expect(recorder.pending_count()).toBe(1)
    recorder.flush_pending()
    await settle()
    expect(sent.map(({ client_listen_id }) => client_listen_id)).toEqual(['id-1'])
    expect(recorder.pending_count()).toBe(0)
  })

  test('keeps the newest 100 pending listens', async () => {
    let accept = false
    const sent: CapturedListen[] = []
    const recorder = recorder_on({ record: async (listen) => { sent.push(listen); return accept } })
    for (let play_id = 1; play_id <= 105; play_id++) recorder.observe({ play_id, played_seconds: 60, duration_seconds: 300, listen: LISTEN })
    await settle()
    expect(recorder.pending_count()).toBe(100)
    sent.length = 0
    accept = true
    recorder.flush_pending()
    await settle()
    expect(sent.map(({ client_listen_id }) => client_listen_id)).toEqual(Array.from({ length: 100 }, (_, index) => `id-${index + 6}`))
  })
})
