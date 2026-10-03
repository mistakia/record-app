import { afterEach, describe, expect, test } from 'bun:test'

import type { EventsState, NodeRequest, NodeResult } from '#shared/bridge.ts'
import { node_api } from '#renderer/store/api.ts'
import { events_state_changed, node_switch_started, select_writes_allowed } from '#renderer/store/connection.ts'
import { create_invalidation_batcher, tags_for_event } from '#renderer/store/event-invalidation.ts'
import { store } from '#renderer/store/index.ts'
import { reconcile, reconcile_retry_delay_ms } from '#renderer/store/reconcile.ts'

const open_state = (connection_id: number): EventsState =>
  ({ status: 'open', node_url: 'http://127.0.0.1:3000', connection_id, attempt: 0, retry_at_ms: null, last_error: null })

// A preload stand-in whose requests resolve when the test says so.
const requests: Array<{ request: NodeRequest, resolve: (result: NodeResult<unknown>) => void }> = []
Object.assign(globalThis, {
  window: {
    record: {
      request: async (request: NodeRequest) => await new Promise<NodeResult<unknown>>((resolve) => { requests.push({ request, resolve }) })
    }
  }
})
const answer_all = (result: NodeResult<unknown>) => { for (const { resolve } of requests.splice(0)) resolve(result) }
const settle = async () => { await new Promise((resolve) => setTimeout(resolve, 5)) }

afterEach(() => {
  answer_all({ ok: true, data: [] })
  store.dispatch(node_api.util.resetApiState())
})

describe('tags_for_event', () => {
  test('maps track, library, and index events, and ignores the rest', () => {
    expect(tags_for_event('track:added')).toEqual(['tracks'])
    expect(tags_for_event('track:removed')).toEqual(['tracks'])
    expect(tags_for_event('library:index-updated')).toEqual(['tracks', 'libraries'])
    expect(tags_for_event('library:replicate-progress')).toEqual(['libraries'])
    expect(tags_for_event('import:finished')).toEqual([])
    expect(tags_for_event('peer:joined')).toEqual([])
  })
})

describe('create_invalidation_batcher', () => {
  test('coalesces a burst into one flush per interval and drops pending tags on cancel', async () => {
    const flushed: string[][] = []
    const batcher = create_invalidation_batcher({ flush: (tags) => { flushed.push(tags) }, interval_ms: 10 })
    for (let index = 0; index < 50; index++) batcher.add(['tracks'])
    batcher.add(['libraries'])
    batcher.add([])
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(flushed).toEqual([['tracks', 'libraries']])
    batcher.add(['tracks'])
    batcher.cancel()
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(flushed).toHaveLength(1)
  })
})

describe('reconcile and the write gate', () => {
  test('data is fresh, and writes allowed, only after the refetch on the current connection completes', async () => {
    const subscription = store.dispatch(node_api.endpoints.get_libraries.initiate())
    await settle()
    answer_all({ ok: true, data: [] })
    await subscription

    store.dispatch(events_state_changed(open_state(1)))
    expect(select_writes_allowed(store.getState())).toBe(false)
    const reconciling = store.dispatch(reconcile({ connection_id: 1 }))
    await settle()
    expect(store.getState().connection.freshness).toBe('reconciling')
    expect(requests.map(({ request }) => request.path_template)).toEqual(['/libraries'])
    answer_all({ ok: true, data: [] })
    await reconciling
    expect(store.getState().connection.freshness).toBe('fresh')
    expect(select_writes_allowed(store.getState())).toBe(true)

    // A drop makes everything stale again.
    store.dispatch(events_state_changed({ ...open_state(1), status: 'reconnecting' }))
    expect(store.getState().connection.freshness).toBe('stale')
    subscription.unsubscribe()
  })

  test('a failed refetch leaves the data stale, and a result for a replaced connection is ignored', async () => {
    const subscription = store.dispatch(node_api.endpoints.get_libraries.initiate())
    await settle()
    answer_all({ ok: true, data: [] })
    await subscription

    store.dispatch(events_state_changed(open_state(2)))
    const seen: { freshness_before_retry: string | null } = { freshness_before_retry: null }
    const failing = store.dispatch(reconcile({
      connection_id: 2,
      // Instead of retrying, the connection drops while it waits.
      wait: async (ms) => {
        if (ms > 0) {
          seen.freshness_before_retry = store.getState().connection.freshness
          store.dispatch(events_state_changed({ ...open_state(2), status: 'reconnecting' }))
        }
        await settle()
      }
    }))
    await settle()
    answer_all({ ok: false, failure: { kind: 'network', message: 'down' } })
    await failing
    expect(seen.freshness_before_retry).toBe('stale')
    store.dispatch(events_state_changed(open_state(2)))

    const replaced = store.dispatch(reconcile({ connection_id: 2 }))
    await settle()
    store.dispatch(events_state_changed(open_state(3)))
    answer_all({ ok: true, data: [] })
    await replaced
    expect(store.getState().connection.freshness).toBe('stale')
    subscription.unsubscribe()
  })

  test('the base query refuses a write while stale without calling main, and sends it once fresh', async () => {
    const with_write = node_api.injectEndpoints({
      endpoints: (build) => ({
        test_write: build.mutation<unknown, void>({
          query: () => ({ method: 'post', path_template: '/listens', body: { track_id: 'x', library_address: 'y' } })
        })
      })
    })
    store.dispatch(events_state_changed({ ...open_state(4), status: 'reconnecting' }))
    const refused = await store.dispatch(with_write.endpoints.test_write.initiate())
    expect(refused.error).toMatchObject({ kind: 'refused' })
    expect(requests).toHaveLength(0)

    store.dispatch(events_state_changed(open_state(5)))
    await store.dispatch(reconcile({ connection_id: 5 }))
    expect(select_writes_allowed(store.getState())).toBe(true)
    const sent = store.dispatch(with_write.endpoints.test_write.initiate())
    await settle()
    expect(requests.map(({ request }) => request.method)).toEqual(['post'])
    answer_all({ ok: true, data: null })
    expect((await sent).error).toBeUndefined()
  })

  test('a node switch blocks writes at once, and a reconcile still running for the old connection cannot mark the new one fresh', async () => {
    const subscription = store.dispatch(node_api.endpoints.get_libraries.initiate())
    await settle()
    answer_all({ ok: true, data: [] })
    await subscription
    store.dispatch(events_state_changed(open_state(10)))
    const first_reconcile = store.dispatch(reconcile({ connection_id: 10 }))
    await settle()
    answer_all({ ok: true, data: [] })
    await first_reconcile
    expect(select_writes_allowed(store.getState())).toBe(true)

    const old_reconcile = store.dispatch(reconcile({ connection_id: 10 }))
    await settle()
    store.dispatch(node_switch_started())
    expect(select_writes_allowed(store.getState())).toBe(false)
    // Main then reports the new node connecting; its first open is a new connection_id.
    store.dispatch(events_state_changed({ ...open_state(10), status: 'connecting', node_url: 'http://127.0.0.1:3001' }))
    answer_all({ ok: true, data: [] })
    await old_reconcile
    expect(store.getState().connection.freshness).toBe('stale')
    store.dispatch(events_state_changed({ ...open_state(11), node_url: 'http://127.0.0.1:3001' }))
    expect(select_writes_allowed(store.getState())).toBe(false)
    subscription.unsubscribe()
  })

  test('a failed reconcile retries with backoff while the connection stays open, and recovers to fresh', async () => {
    const subscription = store.dispatch(node_api.endpoints.get_libraries.initiate())
    await settle()
    answer_all({ ok: true, data: [] })
    await subscription
    store.dispatch(events_state_changed(open_state(20)))
    const waits: number[] = []
    const reconciling = store.dispatch(reconcile({ connection_id: 20, wait: async (ms) => { if (ms > 0) waits.push(ms); await settle() } }))
    // Each refetch is answered as it arrives: two failures, then success.
    const results: Array<NodeResult<unknown>> = [
      { ok: false, failure: { kind: 'network', message: 'down' } },
      { ok: false, failure: { kind: 'network', message: 'down' } },
      { ok: true, data: [] }
    ]
    const progress = { done: false }
    reconciling.then(() => { progress.done = true }).catch(() => { progress.done = true })
    while (!progress.done) {
      await settle()
      const result = results[0]
      if (requests.length > 0 && result !== undefined) {
        if (results.length > 1) results.shift()
        answer_all(result)
      }
    }
    expect(waits).toEqual([1000, 2000])
    expect(store.getState().connection.freshness).toBe('fresh')
    expect(select_writes_allowed(store.getState())).toBe(true)
    subscription.unsubscribe()
  })

  test('retries stop once the connection drops', async () => {
    const subscription = store.dispatch(node_api.endpoints.get_libraries.initiate())
    await settle()
    answer_all({ ok: true, data: [] })
    await subscription
    store.dispatch(events_state_changed(open_state(30)))
    let attempts = 0
    const reconciling = store.dispatch(reconcile({
      connection_id: 30,
      wait: async (ms) => {
        if (ms > 0) {
          attempts++
          store.dispatch(events_state_changed({ ...open_state(30), status: 'reconnecting' }))
        }
        await settle()
      }
    }))
    await settle(); await settle()
    answer_all({ ok: false, failure: { kind: 'network', message: 'down' } })
    await reconciling
    expect(attempts).toBe(1)
    expect(requests).toHaveLength(0)
    subscription.unsubscribe()
  })

  test('the retry delay doubles from 1 s and caps at 30 s', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(reconcile_retry_delay_ms)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000])
  })
})
