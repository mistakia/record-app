// Bearer-token custody (spec §8.7.3, §8.10.7): the token check, the
// Keychain store's use of /usr/bin/security (token on stdin only), the
// per-node auth state, and a session that opens nothing for a node that
// refused its token.

import { describe, expect, test } from 'bun:test'

import { create_node_auth } from '#main/node-auth.ts'
import { events_protocols } from '#main/node-events.ts'
import { create_node_session } from '#main/node-session.ts'
import { check_token, create_keychain_token_store, create_memory_token_store, type RunSecurity } from '#main/token-store.ts'
import { IPC_CHANNELS, type EventsState } from '#shared/bridge.ts'

const NODE = 'https://node.example.com:443'

describe('check_token', () => {
  test('takes an HTTP token, trimmed, and refuses what the subprotocol cannot carry', () => {
    expect(check_token('  abc.DEF-123_~  ')).toEqual({ ok: true, token: 'abc.DEF-123_~' })
    for (const bad of ['', '   ', 'has space', 'a"b', 'a,b', 'a/b', 'a=b', 'é', 'x'.repeat(4097), 42, null]) {
      expect(check_token(bad).ok).toBe(false)
    }
  })

  test('offers the token as bearer.<token> beside record, and nothing without one', () => {
    expect(events_protocols('t0k')).toEqual(['record', 'bearer.t0k'])
    expect(events_protocols(null)).toEqual([])
  })
})

describe('keychain token store', () => {
  const create_fake_security = () => {
    const items = new Map<string, string>()
    const calls: Array<{ args: string[], stdin: string | undefined }> = []
    const run: RunSecurity = async ({ args, stdin }) => {
      calls.push({ args, stdin })
      const account = args[args.indexOf('-a') + 1] ?? ''
      if (args[0] === '-i') {
        const match = /-a "([^"]+)" .* -w "([^"]+)"/.exec(stdin ?? '')
        if (match?.[1] !== undefined && match[2] !== undefined) items.set(match[1], match[2])
        return { code: 0, stdout: '', stderr: '' }
      }
      if (args[0] === 'find-generic-password') {
        const value = items.get(account)
        return value === undefined ? { code: 44, stdout: '', stderr: 'not found' } : { code: 0, stdout: `${value}\n`, stderr: '' }
      }
      if (args[0] === 'delete-generic-password') return { code: items.delete(account) ? 0 : 44, stdout: '', stderr: '' }
      return { code: 1, stdout: '', stderr: 'unexpected' }
    }
    return { items, calls, run }
  }

  test('writes the token through stdin, never argv, and reads and deletes it by node URL', async () => {
    const fake = create_fake_security()
    const store = create_keychain_token_store({ run: fake.run })
    expect(await store.get(NODE)).toBeNull()
    await store.set(NODE, "s3cr$t'|&")
    expect(await store.get(NODE)).toBe("s3cr$t'|&")
    for (const { args } of fake.calls) expect(args.join(' ')).not.toContain('s3cr')
    expect(fake.calls.some(({ stdin }) => stdin?.includes('s3cr') === true)).toBe(true)
    await store.delete(NODE)
    await store.delete(NODE)
    expect(await store.get(NODE)).toBeNull()
  })

  test('refuses to store a token that is not tchar, and reports a write that did not land', async () => {
    const fake = create_fake_security()
    const store = create_keychain_token_store({ run: fake.run })
    await expect(store.set(NODE, 'a" -w "b')).rejects.toThrow()
    const failing = create_keychain_token_store({ run: async () => ({ code: 0, stdout: '', stderr: 'denied' }) })
    await expect(failing.set(NODE, 'token')).rejects.toThrow('Keychain write failed')
  })

  test.if(process.platform === 'darwin')('round-trips through the real login Keychain', async () => {
    const store = create_keychain_token_store()
    const account = `http://record-app-test-${process.pid}-${Date.now()}.invalid:1`
    try {
      await store.set(account, 'round-trip-token')
      expect(await store.get(account)).toBe('round-trip-token')
    } finally {
      await store.delete(account)
    }
    expect(await store.get(account)).toBeNull()
  })
})

describe('node auth', () => {
  test('a 401 for the token sent deletes it and blocks the node until a new token is saved', async () => {
    const tokens = create_memory_token_store()
    await tokens.set(NODE, 'old')
    const auth = create_node_auth({ tokens })
    await auth.load(NODE)
    expect(auth.view(NODE)).toEqual({ status: 'saved', persistent: false })
    // A 401 for a token that has since been replaced changes nothing.
    expect(await auth.reject(NODE, 'older')).toBe(false)
    expect(await auth.reject(NODE, 'old')).toBe(true)
    expect(await tokens.get(NODE)).toBeNull()
    expect(auth.blocked(NODE)).toBe(true)
    expect(auth.view(NODE).status).toBe('rejected')
    // A second 401 from a request already in flight is not a new event.
    expect(await auth.reject(NODE, null)).toBe(false)
    await auth.save(NODE, 'new')
    expect(auth.blocked(NODE)).toBe(false)
    expect(auth.token(NODE)).toBe('new')
    await auth.logout(NODE)
    expect(auth.view(NODE).status).toBe('none')
    expect(await tokens.get(NODE)).toBeNull()
  })

  test('a node that refuses a request without a token is blocked as well', async () => {
    const auth = create_node_auth({ tokens: create_memory_token_store() })
    await auth.load(NODE)
    expect(await auth.reject(NODE, null)).toBe(true)
    expect(auth.view(NODE).status).toBe('rejected')
  })

  test('a Keychain that cannot be read leaves the node without a token', async () => {
    const logged: string[] = []
    const auth = create_node_auth({
      tokens: { ...create_memory_token_store(), get: async () => { throw new Error('locked') } },
      log: (message) => { logged.push(message) }
    })
    await auth.load(NODE)
    expect(auth.token(NODE)).toBeNull()
    expect(logged).toHaveLength(1)
  })
})

describe('session auth', () => {
  test('a blocked node opens no socket and reports unauthorized', () => {
    const sent: Array<{ channel: string, payload: unknown }> = []
    let opened = 0
    const session = create_node_session({
      broadcast: (channel, payload) => { sent.push({ channel, payload }) },
      open_events: () => { opened++; throw new Error('must not open') }
    })
    session.start({ node_url: NODE, token: null, blocked: true })
    expect(opened).toBe(0)
    expect(session.get_state()).toMatchObject({ status: 'unauthorized', node_url: NODE })
    expect(sent.at(-1)).toMatchObject({ channel: IPC_CHANNELS.events_state, payload: { status: 'unauthorized' } })
  })

  test('the socket carries the token, and a reconnect probe that gets 401 reports it', async () => {
    const unauthorized: Array<{ node_url: string, token: string | null }> = []
    const tokens: Array<string | null | undefined> = []
    let report: ((state: EventsState) => void) | undefined
    const session = create_node_session({
      broadcast: () => {},
      on_unauthorized: (target) => { unauthorized.push(target) },
      check: async () => ({ ok: false, failure: { kind: 'auth', status: 401, message: 'no' } }),
      open_events: (options) => {
        tokens.push(options.token)
        report = options.on_state
        return { get_state: () => ({ status: 'connecting', node_url: NODE, connection_id: 0, attempt: 0, retry_at_ms: null, last_error: null }), reconnect_now: () => {}, force_reconnect: () => {}, close: () => {} }
      }
    })
    session.start({ node_url: NODE, token: 'tok', blocked: false })
    expect(tokens).toEqual(['tok'])
    report?.({ status: 'reconnecting', node_url: NODE, connection_id: 0, attempt: 1, retry_at_ms: 1, last_error: 'closed' })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(unauthorized).toEqual([{ node_url: NODE, token: 'tok' }])
  })
})
