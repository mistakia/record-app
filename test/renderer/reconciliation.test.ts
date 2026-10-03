import { afterEach, describe, expect, test } from 'bun:test'

import type { EventsState, NodeRequest, NodeResult } from '#shared/bridge.ts'
import { node_api } from '#renderer/store/api.ts'
import { events_state_changed, node_switch_started, select_writes_allowed } from '#renderer/store/connection.ts'
import { create_invalidation_batcher, tags_for_event } from '#renderer/store/event-invalidation.ts'
import { store } from '#renderer/store/index.ts'
import { reconcile, reconcile_retry_delay_ms } from '#renderer/store/reconcile.ts'
import { mark_libraries, moved_libraries, tags_for_moved } from '#renderer/store/library-heads.ts'
import { reset_head_baseline } from '#renderer/store/head-check.ts'
import { track_page_args } from '#renderer/store/api.ts'
import { mark_restored_page } from '#renderer/snapshot/restored.ts'
import type { Library } from '#renderer/api/types.ts'

const library = (address: string, heads: string[], library_type = 'recordstore'): Library => ({
  id: address,
  address,
  library_type,
  track_count: 0,
  linked_library_count: 0,
  audio_size_bytes: 0,
  length: 0,
  heads,
  replication_status: { progress: 0, total: 0 },
  is_replicating: false,
  connected: true,
  is_loading_index: false,
  is_processing_index: false,
  is_linked: true,
  is_own: false,
  is_retired: false,
  held_capability_ids: [],
  peer_ids: []
})

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
  reset_head_baseline()
  answer_all({ ok: true, data: [] })
  store.dispatch(node_api.util.resetApiState())
})

describe('tags_for_event', () => {
  test('maps track, library, peer, and index events, and ignores import events', () => {
    expect(tags_for_event('track:added')).toEqual(['tracks', 'tags'])
    expect(tags_for_event('track:removed')).toEqual(['tracks', 'tags'])
    expect(tags_for_event('library:index-updated')).toEqual(['tracks', 'tags', 'libraries'])
    expect(tags_for_event('library:replicate-progress')).toEqual(['libraries'])
    expect(tags_for_event('library:linked')).toEqual(['libraries', 'tracks', 'tags', 'about'])
    expect(tags_for_event('library:peer-joined')).toEqual(['libraries', 'peers'])
    expect(tags_for_event('peer:joined')).toEqual(['peers'])
    expect(tags_for_event('import:finished')).toEqual([])
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
    expect(requests.map(({ request }) => request.path_template)).toEqual(['/libraries', '/identity/meta-log'])
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
    answer_all({ ok: false, failure: { kind: 'network', message: 'down', code: 'ECONNREFUSED' } })
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
    const reconciling = store.dispatch(reconcile({ connection_id: 5 }))
    await settle()
    answer_all({ ok: true, data: [] })
    await reconciling
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
      { ok: false, failure: { kind: 'network', message: 'down', code: 'ECONNREFUSED' } },
      { ok: false, failure: { kind: 'network', message: 'down', code: 'ECONNREFUSED' } },
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
    answer_all({ ok: false, failure: { kind: 'network', message: 'down', code: 'ECONNREFUSED' } })
    await reconciling
    expect(attempts).toBe(1)
    expect(requests).toHaveLength(0)
    subscription.unsubscribe()
  })

  test('the retry delay doubles from 1 s and caps at 30 s', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(reconcile_retry_delay_ms)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000])
  })

  test('the head-check refetches only what moved: a library, its index, an own library, or the identity library', async () => {
    const answer = async (respond: (request: NodeRequest) => unknown) => {
      for (let round = 0; round < 10 && requests.length > 0; round++) {
        for (const { request, resolve } of requests.splice(0)) resolve({ ok: true, data: respond(request) })
        await settle()
      }
    }
    let current = [library('/a', ['h1']), library('/b', ['h2'])]
    let identity_heads = ['i1']
    const respond = (request: NodeRequest) =>
      request.path_template === '/libraries' ? current : request.path_template === '/identity/meta-log' ? { address: '/i', heads: identity_heads, items: [], total: 0 } : { items: [], total: 0 }
    const subscriptions = [
      store.dispatch(node_api.endpoints.get_libraries.initiate()),
      store.dispatch(node_api.endpoints.get_tracks.initiate(track_page_args({ library_address: '/a', page: 0 }))),
      store.dispatch(node_api.endpoints.get_tracks.initiate(track_page_args({ library_address: '/b', page: 0 }))),
      store.dispatch(node_api.endpoints.get_tracks.initiate(track_page_args({ library_address: '', page: 0 })))
    ]
    await settle()
    await answer(respond)
    let connection_id = 30
    const reconcile_seeing = async (): Promise<string[]> => {
      store.dispatch(events_state_changed(open_state(++connection_id)))
      const reconciling = store.dispatch(reconcile({ connection_id }))
      await settle()
      const seen: string[] = []
      await answer((request) => {
        if (request.path_template === '/tracks') seen.push(JSON.stringify(request.query?.library_addresses ?? null))
        return respond(request)
      })
      await reconciling
      expect(store.getState().connection.freshness).toBe('fresh')
      return seen.sort()
    }

    // The first check this run has no baseline: every page refetches.
    expect(await reconcile_seeing()).toEqual(['["/a"]', '["/b"]', 'null'])
    // Nothing moved: no page refetches.
    expect(await reconcile_seeing()).toEqual([])
    // /a's heads moved: its page and the aggregated one.
    current = [library('/a', ['h3']), library('/b', ['h2'])]
    expect(await reconcile_seeing()).toEqual(['["/a"]', 'null'])
    // /b's index moved with the same heads.
    current = [library('/a', ['h3']), { ...library('/b', ['h2']), track_count: 7 }]
    expect(await reconcile_seeing()).toEqual(['["/b"]', 'null'])
    // The identity library moved (a pin on another device): every page.
    identity_heads = ['i2']
    expect(await reconcile_seeing()).toEqual(['["/a"]', '["/b"]', 'null'])
    // A page the snapshot restored is refetched once even with no move.
    mark_restored_page('/b')
    expect(await reconcile_seeing()).toEqual(['["/b"]'])
    for (const subscription of subscriptions) subscription.unsubscribe()
  })

  test('moved_libraries and tags_for_moved', () => {
    const moved = moved_libraries({
      before: mark_libraries([library('/a', ['h1', 'h2']), library('/gone', ['x'])]),
      after: mark_libraries([library('/a', ['h2', 'h1']), library('/new', ['y']), library('/l', ['z'], 'listens')])
    })
    expect(moved.map(({ address }) => address).sort()).toEqual(['/gone', '/l', '/new'])
    expect(tags_for_moved({ moved })).toContainEqual('listens')
    expect(tags_for_moved({ moved })).not.toContainEqual('tracks')
    expect(tags_for_moved({ moved: [], identity_moved: true })).toEqual(['tracks', 'listens'])
    const own = mark_libraries([{ ...library('/own', ['h']), is_own: true }]).get('/own')
    if (own === undefined) throw new Error('no mark')
    expect(tags_for_moved({ moved: [own] })).toContainEqual('tracks')
    expect(tags_for_moved({ moved: [] })).toEqual([])
  })
})
