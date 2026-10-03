import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { get_audio } from '#main/node-client.ts'

const CHUNK = new Uint8Array(64 * 1024)
const CHUNK_COUNT = 4
let server: ReturnType<typeof Bun.serve>

// A node stand-in whose audio either declares its length or streams chunked
// with no Content-Length at all.
beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch: (request) => {
      const body = new Uint8Array(CHUNK.byteLength * CHUNK_COUNT)
      if (new URL(request.url).pathname === '/api/audio/declared') return new Response(body)
      let sent = 0
      const stream = new ReadableStream({
        pull: (controller) => {
          if (sent++ === CHUNK_COUNT) controller.close()
          else controller.enqueue(CHUNK)
        }
      })
      return new Response(stream)
    }
  })
})

afterAll(async () => { await server.stop(true) })

describe('get_audio size cap', () => {
  const node_url = () => `http://127.0.0.1:${server.port}`
  const size = CHUNK.byteLength * CHUNK_COUNT

  test('returns a body within the cap, declared or chunked', async () => {
    for (const cid of ['declared', 'chunked']) {
      const audio = await get_audio({ node_url: node_url(), cid, max_bytes: size })
      expect(audio.ok && audio.data.byteLength).toBe(size)
    }
  })

  test('refuses a declared Content-Length over the cap', async () => {
    const audio = await get_audio({ node_url: node_url(), cid: 'declared', max_bytes: size - 1 })
    expect(!audio.ok && audio.failure.kind).toBe('too_large')
  })

  test('stops reading a chunked body once it passes the cap', async () => {
    const audio = await get_audio({ node_url: node_url(), cid: 'chunked', max_bytes: CHUNK.byteLength + 1 })
    expect(!audio.ok && audio.failure.kind).toBe('too_large')
  })
})
