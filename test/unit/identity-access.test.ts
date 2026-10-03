import { describe, expect, test } from 'bun:test'

import { create_identity_access, is_cleartext_remote } from '#main/identity-access.ts'
import type { NodeRequest, NodeResult } from '#shared/bridge.ts'

const KEYS = { public_key: '0802122103' + 'cd'.repeat(32), private_key: '08021220' + 'ab'.repeat(32) }
const PUBLIC_KEY = '03' + 'cd'.repeat(32)

// GET /identity answers the compressed public key alone; GET /identity/export
// the marshaled key pair.
const create_counting_access = (node_url: string) => {
  const calls: NodeRequest[] = []
  const connection = { mode: 'remote' as const, node_url }
  const identity = create_identity_access({
    get_connection: () => connection,
    confirm_export: async () => true,
    call: async ({ request }): Promise<NodeResult<unknown>> => {
      calls.push(request)
      return { ok: true, data: request.path_template === '/identity' ? { public_key: PUBLIC_KEY, meta_log_address: '/record/z/identity', own_library_address: '/record/z/record' } : KEYS }
    }
  })
  return { identity, calls, connection }
}

describe('identity access', () => {
  test('reads the public key from GET /identity once per node URL', async () => {
    const { identity, calls, connection } = create_counting_access('http://127.0.0.1:3000')
    expect(await identity.public_key()).toEqual({ ok: true, data: { public_key: PUBLIC_KEY } })
    expect(await identity.public_key()).toEqual({ ok: true, data: { public_key: PUBLIC_KEY } })
    expect(calls.map(({ path_template }) => path_template)).toEqual(['/identity'])
    connection.node_url = 'http://127.0.0.1:3001'
    await identity.public_key()
    expect(calls).toHaveLength(2)
    identity.forget()
    await identity.public_key()
    expect(calls).toHaveLength(3)
  })

  test('reads it over plain http to another machine too, since GET /identity carries no private key (spec §8.5.7)', async () => {
    const { identity, calls } = create_counting_access('http://192.168.1.20:3000')
    expect(await identity.public_key()).toEqual({ ok: true, data: { public_key: PUBLIC_KEY } })
    expect(calls.map(({ path_template }) => path_template)).toEqual(['/identity'])
    expect(is_cleartext_remote('https://node.example.com:443')).toBe(false)
    expect(is_cleartext_remote('http://localhost:3000')).toBe(false)
    expect(is_cleartext_remote('http://node.example.com:80')).toBe(true)
  })

  test('only a confirmed export reads /identity/export', async () => {
    const { identity, calls } = create_counting_access('http://127.0.0.1:3000')
    await identity.public_key()
    expect(calls.map(({ path_template }) => path_template)).not.toContain('/identity/export')
    expect(await identity.export_identity()).toEqual({ ok: true, data: KEYS })
    expect(calls.map(({ path_template }) => path_template)).toEqual(['/identity', '/identity/export'])
  })
})
