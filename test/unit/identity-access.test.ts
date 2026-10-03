import { describe, expect, test } from 'bun:test'

import { create_identity_access, is_cleartext_remote } from '#main/identity-access.ts'
import type { NodeRequest, NodeResult } from '#shared/bridge.ts'

const KEYS = { public_key: '0802122103' + 'cd'.repeat(32), private_key: '08021220' + 'ab'.repeat(32) }

const create_counting_access = (node_url: string) => {
  const calls: NodeRequest[] = []
  const connection = { mode: 'remote' as const, node_url }
  const identity = create_identity_access({
    get_connection: () => connection,
    confirm_export: async () => true,
    call: async ({ request }): Promise<NodeResult<unknown>> => {
      calls.push(request)
      return { ok: true, data: KEYS }
    }
  })
  return { identity, calls, connection }
}

describe('identity access', () => {
  test('reads the public key from the node once per node URL and keeps only the public half', async () => {
    const { identity, calls, connection } = create_counting_access('http://127.0.0.1:3000')
    expect(await identity.public_key()).toEqual({ ok: true, data: { public_key: KEYS.public_key } })
    expect(await identity.public_key()).toEqual({ ok: true, data: { public_key: KEYS.public_key } })
    expect(calls).toHaveLength(1)
    connection.node_url = 'http://127.0.0.1:3001'
    await identity.public_key()
    expect(calls).toHaveLength(2)
    identity.forget()
    await identity.public_key()
    expect(calls).toHaveLength(3)
  })

  test('refuses to read it over plain http to another machine, without calling the node', async () => {
    const { identity, calls } = create_counting_access('http://192.168.1.20:3000')
    expect(await identity.public_key()).toMatchObject({ ok: false, failure: { kind: 'refused' } })
    expect(calls).toHaveLength(0)
    expect(is_cleartext_remote('https://node.example.com:443')).toBe(false)
    expect(is_cleartext_remote('http://localhost:3000')).toBe(false)
    expect(is_cleartext_remote('http://node.example.com:80')).toBe(true)
  })

  test('an export fills the public key, so showing it afterwards needs no second read', async () => {
    const { identity, calls } = create_counting_access('http://127.0.0.1:3000')
    expect(await identity.export_identity()).toEqual({ ok: true, data: KEYS })
    await identity.public_key()
    expect(calls).toHaveLength(1)
  })
})
