import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { open_connection_store } from '#main/connection-store.ts'
import { create_node_auth } from '#main/node-auth.ts'
import { create_node_connection, node_key_of } from '#main/node-connection.ts'
import { create_memory_token_store } from '#main/token-store.ts'
import type { BundledState } from '#shared/bridge.ts'

const create_fake_manager = () => {
  const calls: string[] = []
  let state = { status: 'stopped', url: null, node_key_pin: null } as Pick<BundledState, 'status' | 'url' | 'node_key_pin'>
  return {
    calls,
    set: (next: Pick<BundledState, 'status' | 'url' | 'node_key_pin'>) => { state = next },
    manager: {
      get_state: () => state as BundledState,
      start: async () => { calls.push('start'); state = { ...state, status: 'starting', url: null } },
      stop: async () => { calls.push('stop'); state = { ...state, status: 'stopped', url: null } }
    }
  }
}

describe('node connection', () => {
  test('bundled mode follows the child: no node until it is healthy, then its URL; the node key stays "bundled"', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'record-app-node-connection-'))
    try {
      const store = await open_connection_store({ file_path: join(directory, 'connection.json') })
      const fake = create_fake_manager()
      const sessions: Array<string | null> = []
      let changes = 0
      const views: Array<string | null> = []
      const connection = create_node_connection({
        store,
        auth: create_node_auth({ tokens: create_memory_token_store() }),
        manager: fake.manager,
        session: { start: (target) => { sessions.push(target?.node_url ?? null) } },
        on_node_changed: () => { changes++ },
        on_view_changed: (view) => { views.push(view.node_key) }
      })

      await connection.start()
      expect(fake.calls).toEqual(['start'])
      expect(connection.node_url()).toBeNull()
      // No key until the bundled node first answers and is pinned.
      expect(connection.view()).toEqual({ mode: 'bundled', node_url: null, node_key: null, auth: { status: 'none', persistent: false } })
      const pin = { peer_id: '12D3KooWPeer', own_library_address: '/record/z1/record' }
      fake.set({ status: 'running', url: 'http://127.0.0.1:41000', node_key_pin: pin })
      connection.sync()
      expect(connection.node_key()).toBe('bundled:12D3KooWPeer:/record/z1/record')
      expect(views).toEqual(['bundled:12D3KooWPeer:/record/z1/record'])
      // An imported identity changes the own library, so the key changes too.
      fake.set({ status: 'running', url: 'http://127.0.0.1:41000', node_key_pin: { ...pin, own_library_address: '/record/z2/record' } })
      connection.sync()
      expect(views.at(-1)).toBe('bundled:12D3KooWPeer:/record/z2/record')
      expect(connection.node_url()).toBe('http://127.0.0.1:41000')
      expect(sessions).toEqual([null, 'http://127.0.0.1:41000'])

      // Switching to remote stops the child first; one node at a time.
      await store.save({ mode: 'remote', node_url: 'http://127.0.0.1:8088' })
      await connection.switched()
      expect(fake.calls).toEqual(['start', 'stop'])
      expect(sessions.at(-1)).toBe('http://127.0.0.1:8088')
      expect(node_key_of({ config: store.get(), pin })).toBe('http://127.0.0.1:8088')

      await store.save({ mode: 'bundled', node_url: 'http://127.0.0.1:8088' })
      await connection.switched()
      expect(fake.calls).toEqual(['start', 'stop', 'start'])
      expect(sessions.at(-1)).toBeNull()
      expect(changes).toBe(sessions.length)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
