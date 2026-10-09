// Images through main against an in-process record-node: an ingested track's
// embedded picture comes back with its type, and a CID with no image, or one
// that is audio, does not (GET /images/{cid}); an uploaded avatar is stored
// and served, and a file that is not an image is refused (POST /images).

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { upload_chosen_image } from '#main/image-files.ts'
import { get_image, request_node } from '#main/node-client.ts'
import type { Track, TrackList } from '#renderer/api/types.ts'
import { start_test_node, type TestNode } from './node-fixture.ts'

let node: TestNode
let track: Track
let cover: string

beforeAll(async () => {
  node = await start_test_node()
  const path = join(node.work_dir, 'With Art.flac')
  cover = join(node.work_dir, 'cover.png')
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=red:s=64x64', '-frames:v', '1', cover])
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', node.make_audio({ name: 'Bare.flac', seed: 41, seconds: 8 }), '-i', cover,
    '-map', '0', '-map', '1', '-c', 'copy', '-disposition:v', 'attached_pic', '-metadata', 'title=With Art', path])
  await node.peer.ingest_file(path)
  await node.peer.ingest_file(node.make_audio({ name: 'No Art.flac', seed: 42 }))
  const listed = await request_node({ node_url: node.node_url, request: { method: 'get', path_template: '/tracks', query: { query: 'With Art' } } })
  if (!listed.ok) throw new Error(listed.failure.message)
  const found = (listed.data as TrackList).items.find(({ title }) => title === 'With Art')
  if (found === undefined) throw new Error('the ingested track is not listed')
  track = found
}, 120_000)

afterAll(async () => { await node.stop() })

describe('images', () => {
  test('the artwork of an ingested track comes back as a PNG', async () => {
    const cid = track.artwork?.[0]
    expect(cid).toBeString()
    const image = await get_image({ node_url: node.node_url, cid: cid ?? '' })
    if (!image.ok) throw new Error(image.failure.message)
    expect(image.data.mime).toBe('image/png')
    expect([...new Uint8Array(image.data.data.slice(0, 4))]).toEqual([0x89, 0x50, 0x4e, 0x47])
  })

  test('the audio blob is not served as an image, and an unknown CID is not found', async () => {
    expect((await get_image({ node_url: node.node_url, cid: track.audio_cid })).ok).toBe(false)
    const unknown = await get_image({ node_url: node.node_url, cid: 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy' })
    expect(!unknown.ok && unknown.failure).toMatchObject({ kind: 'http', status: 404 })
  })

  test('an uploaded image is stored, and served back as the avatar it will be', async () => {
    const stored = await upload_chosen_image({ node_url: node.node_url, path: cover })
    if (!stored.ok) throw new Error(stored.failure.message)
    expect(stored.data.mime).toBe('image/png')
    const image = await get_image({ node_url: node.node_url, cid: stored.data.cid })
    if (!image.ok) throw new Error(image.failure.message)
    expect(image.data.mime).toBe('image/png')
  })

  test('a file that is not an image is refused', async () => {
    const text = join(node.work_dir, 'not-an-image.png')
    await writeFile(text, 'plain text, not a picture')
    const stored = await upload_chosen_image({ node_url: node.node_url, path: text })
    expect(!stored.ok && stored.failure).toMatchObject({ kind: 'http', status: 400 })
  })
})
