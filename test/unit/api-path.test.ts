import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

import { build_api_path } from '#main/api-path.ts'
import { API_ROUTES } from '#shared/api-routes.ts'
// @ts-expect-error -- plain JavaScript CLI module without type declarations
import { list_api_routes } from '../../cli/generate-api-routes.mjs'

describe('build_api_path', () => {
  test('builds a path for a route in the pinned yaml, with query values', () => {
    expect(build_api_path({ method: 'get', path_template: '/settings' })).toEqual({ ok: true, path: '/api/settings' })
    expect(build_api_path({
      method: 'get',
      path_template: '/tracks',
      query: { offset: 200, limit: 200, library_addresses: ['/record/a/b', 'c d'], query: undefined }
    })).toEqual({ ok: true, path: '/api/tracks?offset=200&limit=200&library_addresses=%2Frecord%2Fa%2Fb&library_addresses=c+d' })
  })

  test('encodes path parameters with encodeURIComponent', () => {
    const address = '/record/bafyabc/record'
    expect(build_api_path({ method: 'get', path_template: '/libraries/{address}', params: { address } }))
      .toEqual({ ok: true, path: `/api/libraries/${encodeURIComponent(address)}` })
    expect(build_api_path({ method: 'delete', path_template: '/libraries/{address}', params: { address: '../../settings' } }))
      .toEqual({ ok: true, path: '/api/libraries/..%2F..%2Fsettings' })
  })

  test('refuses a method or path template the yaml does not have', () => {
    for (const request of [
      { method: 'get', path_template: '/admin' },
      { method: 'put', path_template: '/tracks' },
      { method: 'get', path_template: '/tracks/../settings' },
      { method: 'get', path_template: 'http://evil.example/api/tracks' },
      { method: 'post', path_template: '/settings' }
    ]) {
      expect(build_api_path(request).ok).toBe(false)
    }
  })

  test('refuses routes with a dedicated channel', () => {
    expect(build_api_path({ method: 'get', path_template: '/audio/{cid}', params: { cid: 'bafy' } }).ok).toBe(false)
    expect(build_api_path({ method: 'post', path_template: '/import/file' }).ok).toBe(false)
  })

  test('refuses dot-segment parameters, which URL parsing would resolve onto another route', () => {
    for (const address of ['.', '..']) {
      expect(build_api_path({ method: 'post', path_template: '/libraries/{address}/connect', params: { address } }).ok).toBe(false)
      expect(build_api_path({ method: 'get', path_template: '/libraries/{address}', params: { address } }).ok).toBe(false)
    }
  })

  test('keeps slash-bearing and URL-shaped parameters inside one path segment', () => {
    const cases: Array<[string, string]> = [
      ['/', '%2F'],
      ['%2F', '%252F'],
      ['../..', '..%2F..'],
      ['./x', '.%2Fx'],
      ['http://evil.example/api/settings', 'http%3A%2F%2Fevil.example%2Fapi%2Fsettings'],
      ['//evil.example', '%2F%2Fevil.example'],
      ['a?b#c', 'a%3Fb%23c']
    ]
    for (const [address, encoded] of cases) {
      const built = build_api_path({ method: 'post', path_template: '/libraries/{address}/connect', params: { address } })
      expect(built).toEqual({ ok: true, path: `/api/libraries/${encoded}/connect` })
      if (!built.ok) continue
      expect(new URL(built.path, 'http://127.0.0.1:3000').pathname).toBe(`/api/libraries/${encoded}/connect`)
    }
  })

  test('refuses missing, empty, or unexpected path parameters', () => {
    expect(build_api_path({ method: 'get', path_template: '/libraries/{address}' }).ok).toBe(false)
    expect(build_api_path({ method: 'get', path_template: '/libraries/{address}', params: { address: '' } }).ok).toBe(false)
    expect(build_api_path({ method: 'get', path_template: '/settings', params: { extra: 'x' } }).ok).toBe(false)
  })

  test('refuses malformed query keys and non-primitive values', () => {
    expect(build_api_path({ method: 'get', path_template: '/tracks', query: { 'a&b': 1 } }).ok).toBe(false)
    expect(build_api_path({ method: 'get', path_template: '/tracks', query: { offset: { nested: 1 } as unknown as number } }).ok).toBe(false)
  })
})

describe('API_ROUTES', () => {
  test('matches the pinned record-node yaml (run `bun run gen:api` when it does not)', async () => {
    const yaml = await readFile(new URL('../../node_modules/record-node/dist/api/7-http-api.yaml', import.meta.url), 'utf8')
    expect(list_api_routes(yaml)).toEqual(API_ROUTES)
  })
})
