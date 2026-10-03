import { describe, expect, test } from 'bun:test'

import { check_node_url } from '#shared/node-url.ts'

describe('check_node_url', () => {
  test('accepts http and https origins and normalizes them', () => {
    expect(check_node_url('http://127.0.0.1:8088')).toEqual({ ok: true, node_url: 'http://127.0.0.1:8088', warning: null })
    expect(check_node_url(' http://localhost:3000/ ')).toEqual({ ok: true, node_url: 'http://localhost:3000', warning: null })
    expect(check_node_url('https://node.example.com:8443')).toEqual({ ok: true, node_url: 'https://node.example.com:8443', warning: null })
    expect(check_node_url('http://[::1]:3000')).toEqual({ ok: true, node_url: 'http://[::1]:3000', warning: null })
  })

  test('requires an explicit port, and keeps a written default port', () => {
    for (const input of ['http://127.0.0.1', 'https://node.example.com', 'http://127.0.0.1/', 'http://[::1]', 'http://127.0.0.1:']) {
      expect(check_node_url(input).ok).toBe(false)
    }
    expect(check_node_url('https://node.example.com:443')).toEqual({ ok: true, node_url: 'https://node.example.com:443', warning: null })
    expect(check_node_url('http://127.0.0.1:80/')).toEqual({ ok: true, node_url: 'http://127.0.0.1:80', warning: null })
  })

  test('warns on plain http to a non-loopback host', () => {
    const checked = check_node_url('http://192.168.1.20:3000')
    expect(checked.ok).toBe(true)
    expect(checked.ok && checked.warning).toContain('unencrypted')
  })

  test('refuses other schemes, credentials, paths, queries, fragments, and whitespace', () => {
    for (const input of [
      '',
      'not a url',
      'ftp://127.0.0.1:21',
      'file:///etc/passwd',
      'javascript:alert(1)',
      'ws://127.0.0.1:3000',
      'http://user:secret@127.0.0.1:3000',
      'http://127.0.0.1:3000/api',
      'http://127.0.0.1:3000?x=1',
      'http://127.0.0.1:3000#x',
      'http://127.0.0.1:3000?',
      'http://127.0.0.1 :3000',
      'http://127.0.0.1:3000\u0000'
    ]) {
      expect(check_node_url(input).ok).toBe(false)
    }
  })
})
