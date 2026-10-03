// Bearer-token custody (spec §8.7.3, §8.10.7): the token check, the
// Keychain store's use of /usr/bin/security (token on stdin only), the
// per-node auth state, and a session that opens nothing for a node that
// refused its token.

import { describe, expect, test } from 'bun:test'

import { create_authed_call, NEEDS_TOKEN } from '#main/authed-call.ts'
import { create_node_auth } from '#main/node-auth.ts'
import { events_protocols } from '#main/node-events.ts'
import { create_node_session, type NodeTarget, type SentCredentials } from '#main/node-session.ts'
import { create_keychain_token_store, create_memory_token_store, type RunSecurity } from '#main/token-store.ts'
import { IPC_CHANNELS, type EventsState, type NodeResult } from '#shared/bridge.ts'
import { check_token, MAX_TOKEN_CHARS } from '#shared/token.ts'

const NODE = 'https://node.example.com:443'

describe('check_token', () => {
  test('takes an HTTP token, trimmed, and refuses what the subprotocol cannot carry', () => {
    expect(check_token('  abc.DEF-123_~  ')).toEqual({ ok: true, token: 'abc.DEF-123_~' })
    for (const bad of ['', '   ', 'has space', 'a"b', 'a,b', 'a/b', 'a=b', 'é', 'x'.repeat(MAX_TOKEN_CHARS + 1), 42, null]) {
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

  test('refuses a token that is not tchar, a command line near security\'s limit, and reports a write that did not land without echoing security\'s output', async () => {
    const fake = create_fake_security()
    const store = create_keychain_token_store({ run: fake.run })
    await expect(store.set(NODE, 'a" -w "b')).rejects.toThrow()
    // The longest token with a long URL: refused before security runs.
    const long_url = `https://${'h'.repeat(1500)}.example:443`
    await expect(store.set(long_url, 't'.repeat(MAX_TOKEN_CHARS))).rejects.toThrow('too long')
    expect(fake.calls.some(({ args }) => args[0] === '-i')).toBe(false)
    // The longest token with an ordinary URL fits.
    await store.set(NODE, 't'.repeat(MAX_TOKEN_CHARS))
    const failing = create_keychain_token_store({ run: async () => ({ code: 0, stdout: '', stderr: 'security: unknown command "secret-tail"' }) })
    const error = await failing.set(NODE, 'token').catch((caught: unknown) => caught as Error)
    expect(String(error)).toContain('Keychain write failed')
    expect(String(error)).not.toContain('secret-tail')
  })

  // Writes a real login-Keychain item, so it runs only when asked.
  test.if(process.platform === 'darwin' && process.env.RECORD_TEST_KEYCHAIN === '1')('round-trips through the real login Keychain', async () => {
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
  test('a 401 for the credentials sent deletes the token and blocks the node until a new token is saved', async () => {
    const tokens = create_memory_token_store()
    await tokens.set(NODE, 'old')
    const auth = create_node_auth({ tokens })
    await auth.load(NODE)
    expect(auth.view(NODE)).toEqual({ status: 'saved', persistent: false })
    const sent = auth.credentials(NODE)
    expect(auth.reject(NODE, { ...sent, generation: sent.generation - 1 })).toBe(false)
    expect(auth.reject(NODE, sent)).toBe(true)
    expect(auth.blocked(NODE)).toBe(true)
    expect(auth.view(NODE).status).toBe('rejected')
    // A second 401 from a request already in flight is not a new event.
    expect(auth.reject(NODE, sent)).toBe(false)
    await auth.save(NODE, 'new')
    expect(await tokens.get(NODE)).toBe('new')
    expect(auth.blocked(NODE)).toBe(false)
    expect(auth.credentials(NODE).token).toBe('new')
    await auth.logout(NODE)
    expect(auth.view(NODE).status).toBe('none')
    expect(await tokens.get(NODE)).toBeNull()
  })

  test('a late 401 for a replaced token, even one re-saved with the same value, leaves the new one in place', async () => {
    const tokens = create_memory_token_store()
    await tokens.set(NODE, 'same')
    const auth = create_node_auth({ tokens })
    await auth.load(NODE)
    const in_flight = auth.credentials(NODE)
    const saving = auth.save(NODE, 'same')
    expect(auth.reject(NODE, in_flight)).toBe(false)
    await saving
    expect(await tokens.get(NODE)).toBe('same')
    expect(auth.view(NODE).status).toBe('saved')
  })

  test('Keychain writes for a node run in order, and a rejection deletes only the token it refused', async () => {
    const order: string[] = []
    const memory = create_memory_token_store()
    let release: () => void = () => {}
    const tokens = {
      ...memory,
      set: async (node_url: string, token: string) => {
        order.push(`set ${token} start`)
        await new Promise<void>((resolve) => { release = resolve })
        await memory.set(node_url, token)
        order.push(`set ${token} end`)
      },
      delete: async (node_url: string) => { order.push('delete'); await memory.delete(node_url) }
    }
    await memory.set(NODE, 'old')
    const auth = create_node_auth({ tokens })
    await auth.load(NODE)
    const sent = auth.credentials(NODE)
    // The 401 lands first, then a save starts before its delete has run.
    expect(auth.reject(NODE, sent)).toBe(true)
    const saving = auth.save(NODE, 'new')
    await new Promise((resolve) => setTimeout(resolve, 5))
    release()
    await saving
    expect(order).toEqual(['delete', 'set new start', 'set new end'])
    expect(await memory.get(NODE)).toBe('new')
  })

  test('a node that refuses a request without a token needs one', async () => {
    const auth = create_node_auth({ tokens: create_memory_token_store() })
    await auth.load(NODE)
    expect(auth.reject(NODE, auth.credentials(NODE))).toBe(true)
    expect(auth.view(NODE).status).toBe('required')
  })

  test('a Keychain that cannot be read leaves the node without a token', async () => {
    const logged: string[] = []
    const auth = create_node_auth({
      tokens: { ...create_memory_token_store(), get: async () => { throw new Error('locked') } },
      log: (message) => { logged.push(message) }
    })
    await auth.load(NODE)
    expect(auth.credentials(NODE).token).toBeNull()
    expect(logged).toHaveLength(1)
  })
})

describe('authed call', () => {
  test('sends the token, refuses locally while blocked, and reports a 401 with the credentials it was sent under', async () => {
    let target: NodeTarget = { node_url: NODE, token: 'tok', generation: 3, blocked: false }
    const refused: SentCredentials[] = []
    const authed = create_authed_call({ target: () => target, unauthorized: (sent) => { refused.push(sent); target = { ...target, token: null, generation: 4, blocked: true } } })
    const seen: Array<string | null> = []
    const call = async (status: number | null): Promise<NodeResult<string>> => await authed(async ({ token }) => {
      seen.push(token)
      return status === null ? { ok: true, data: 'ok' } : { ok: false, failure: { kind: 'auth', status, message: 'no' } }
    })
    expect(await call(null)).toEqual({ ok: true, data: 'ok' })
    expect((await call(401)).ok).toBe(false)
    expect(refused).toEqual([{ node_url: NODE, token: 'tok', generation: 3 }])
    // Blocked: nothing more reaches the node.
    expect(await call(null)).toEqual(NEEDS_TOKEN)
    expect(seen).toEqual(['tok', 'tok'])
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
    session.start({ node_url: NODE, token: null, generation: 1, blocked: true })
    expect(opened).toBe(0)
    expect(session.get_state()).toMatchObject({ status: 'unauthorized', node_url: NODE })
    expect(sent.at(-1)).toMatchObject({ channel: IPC_CHANNELS.events_state, payload: { status: 'unauthorized' } })
  })

  test('the socket carries the token, and a reconnect probe that gets 401 reports it', async () => {
    const unauthorized: SentCredentials[] = []
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
    session.start({ node_url: NODE, token: 'tok', generation: 2, blocked: false })
    expect(tokens).toEqual(['tok'])
    report?.({ status: 'reconnecting', node_url: NODE, connection_id: 0, attempt: 1, retry_at_ms: 1, last_error: 'closed' })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(unauthorized).toEqual([{ node_url: NODE, token: 'tok', generation: 2 }])
  })
})
