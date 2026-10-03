// The exported private key must never reach the store, so never the
// hibernation snapshot, which is built from the store and is the only
// renderer state main writes to disk.

import { beforeAll, describe, expect, test } from 'bun:test'

import type { NodeRequest, NodeResult } from '#shared/bridge.ts'

const PRIVATE_KEY = '08021220' + 'ab'.repeat(32)
const PUBLIC_KEY = '0802122103' + 'cd'.repeat(32)
const requests: NodeRequest[] = []
const imports: Array<{ private_key: string }> = []

beforeAll(() => {
  Object.assign(globalThis, {
    window: {
      record: {
        request: async (request: NodeRequest): Promise<NodeResult<unknown>> => {
          requests.push(request)
          return { ok: true, data: null }
        },
        identity: {
          export: async () => ({ ok: true, data: { public_key: PUBLIC_KEY, private_key: PRIVATE_KEY } }),
          import: async (input: { private_key: string }): Promise<NodeResult<unknown>> => {
            imports.push(input)
            return { ok: true, data: { id: 'x', public_key: PUBLIC_KEY, own_library_address: '/record/z/record' } }
          }
        }
      },
      localStorage: (() => {
        const items = new Map<string, string>()
        return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value) } }
      })()
    }
  })
})

describe('identity export', () => {
  test('returns the key to its caller and leaves none in the store, the snapshot, or the export record', async () => {
    const { export_identity, read_last_export, record_export } = await import('#renderer/identity/identity.ts')
    const { store } = await import('#renderer/store/index.ts')
    const { build_snapshot } = await import('#renderer/snapshot/hibernation.ts')
    const { connection_loaded } = await import('#renderer/store/connection.ts')
    const { node_api } = await import('#renderer/store/api.ts')
    store.dispatch(connection_loaded({ mode: 'remote', node_url: 'http://127.0.0.1:3000', node_key: 'http://127.0.0.1:3000', auth: { status: 'none', persistent: true } }))
    await store.dispatch(node_api.util.upsertQueryData('get_libraries', undefined, []))

    const result = await export_identity()
    expect(result).toEqual({ ok: true, data: { public_key: PUBLIC_KEY, private_key: PRIVATE_KEY } })
    record_export('http://127.0.0.1:3000')
    expect(read_last_export('http://127.0.0.1:3000')).toBeNumber()

    expect(JSON.stringify(store.getState())).not.toContain(PRIVATE_KEY)
    const snapshot = build_snapshot({ state: store.getState(), route: '/identity' })
    expect(snapshot).not.toBeNull()
    expect(JSON.stringify(snapshot)).not.toContain(PRIVATE_KEY)
    const storage = (globalThis as unknown as { window: { localStorage: { getItem: (key: string) => string | null } } }).window.localStorage
    expect(storage.getItem('record:last-identity-export:http://127.0.0.1:3000')).not.toContain(PRIVATE_KEY)
  })

  test('import needs the typed phrase and hex key, waits for fresh data, and never keeps the key in the store', async () => {
    const { check_import, IMPORT_CONFIRMATION_PHRASE, truncate_key } = await import('#renderer/identity/identity.ts')
    const { store } = await import('#renderer/store/index.ts')
    const { node_api } = await import('#renderer/store/api.ts')
    const { events_state_changed, reconcile_finished } = await import('#renderer/store/connection.ts')
    expect(check_import({ private_key: PRIVATE_KEY, confirmation: 'yes' })).not.toBeNull()
    expect(check_import({ private_key: 'not hex!', confirmation: IMPORT_CONFIRMATION_PHRASE })).not.toBeNull()
    expect(check_import({ private_key: PRIVATE_KEY, confirmation: ` ${IMPORT_CONFIRMATION_PHRASE.toUpperCase()} ` })).toBeNull()

    const open = { status: 'open' as const, node_url: 'http://127.0.0.1:3000', connection_id: 70, attempt: 0, retry_at_ms: null, last_error: null }
    store.dispatch(events_state_changed({ ...open, status: 'reconnecting' }))
    const gated = await store.dispatch(node_api.endpoints.import_identity.initiate({ private_key: PRIVATE_KEY }, { track: false }))
    expect(gated.error).toMatchObject({ kind: 'refused' })
    expect(imports).toHaveLength(0)

    store.dispatch(events_state_changed(open))
    store.dispatch(reconcile_finished({ connection_id: 70, ok: true }))
    const sent = await store.dispatch(node_api.endpoints.import_identity.initiate({ private_key: PRIVATE_KEY }, { track: false }))
    expect(sent.error).toBeUndefined()
    expect(imports).toEqual([{ private_key: PRIVATE_KEY }])
    expect(requests).toHaveLength(0)
    expect(JSON.stringify(store.getState())).not.toContain(PRIVATE_KEY)
    expect(truncate_key(PUBLIC_KEY)).toBe(`${PUBLIC_KEY.slice(0, 6)}…${PUBLIC_KEY.slice(-6)}`)
  })

  test('the public key shows as the 66-character compressed key, without the libp2p header', async () => {
    const { compressed_public_key } = await import('#renderer/identity/identity.ts')
    const compressed = '03' + 'cd'.repeat(32)
    expect(compressed_public_key('08021221' + compressed)).toBe(compressed)
    expect(compressed_public_key('08021221' + compressed).length).toBe(66)
    expect(compressed_public_key('somethingelse')).toBe('somethingelse')
  })
})

describe('backup prompt', () => {
  test('prompts only in bundled mode before the first export', async () => {
    const { should_prompt_backup } = await import('#renderer/components/identity/backup-prompt.tsx')
    expect(should_prompt_backup({ mode: 'bundled', node_key: 'bundled', last_export: null })).toBe(true)
    expect(should_prompt_backup({ mode: 'bundled', node_key: 'bundled', last_export: 1 })).toBe(false)
    expect(should_prompt_backup({ mode: 'remote', node_key: 'http://127.0.0.1:8088', last_export: null })).toBe(false)
  })
})
