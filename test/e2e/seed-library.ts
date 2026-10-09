// Fills an in-process node's own library with synthetic tracks, enough to
// reproduce a real library's size (the canonical node holds about 200,000).
// One real file is ingested as the template; every other track reuses its
// audio and artwork with its own fingerprint, title, artist, album, and tags,
// appended through record-node's own PUT path and indexed in batches.

import { fileURLToPath } from 'node:url'

import type { TestNode } from '../integration/node-fixture.ts'

const dist = (path: string) => fileURLToPath(new URL(`../../node_modules/record-node/dist/${path}`, import.meta.url))

const ARTISTS = 1200
const ALBUMS_PER_ARTIST = 6
const TAGS = ['house', 'techno', 'ambient', 'disco', 'jazz', 'dub', 'electro', 'soul', 'funk', 'garage', 'breaks', 'acid']

export interface Seeder {
  library_address: string
  // Appends count more tracks, indexed batch at a time.
  add: (input: { count: number, batch?: number, on_progress?: (done: number) => void }) => Promise<void>
}

// The record-node internals the seeder reaches past the package's exports.
interface Context {
  identity: { key_pair: unknown }
  content_store: { get: (cid: string) => Promise<Uint8Array | undefined> }
  libraries: { register: (input: { library_address: string, entries: unknown[] }) => Promise<void> }
}
interface Target { address: string, handle: { oplog: { entries: Map<string, unknown> } } }
interface Internals {
  put_track: (input: { target: unknown, content: Record<string, unknown>, tags?: string[], timestamp?: number }) => Promise<{ entry_hash: string }>
  resolve_write_target: (context: Context, input: Record<string, never>) => Target
  decode_payload: (bytes: Uint8Array) => unknown
}

export const create_seeder = async (node: TestNode): Promise<Seeder> => {
  const { put_track } = await import(dist('ingest/put-track.js')) as Pick<Internals, 'put_track'>
  const { resolve_write_target } = await import(dist('peer/write-target.js')) as Pick<Internals, 'resolve_write_target'>
  const { decode_payload } = await import(dist('entry/payload.js')) as Pick<Internals, 'decode_payload'>
  const { peer } = node
  const template = await peer.ingest_file(node.make_audio({ name: 'Seed Template.flac', seed: 4242, seconds: 4 }))
  const { context } = peer as unknown as { context: Context }
  const target = resolve_write_target(context, {})
  const bytes = await context.content_store.get(template.content_cid)
  if (bytes === undefined) throw new Error('the template content is not stored')
  const content = decode_payload(bytes) as { tags: Record<string, unknown>, audio: Record<string, unknown> }
  const track_target = { oplog: target.handle.oplog, key_pair: context.identity.key_pair, content_store: context.content_store }
  const { libraries } = context
  let next = 0
  const add: Seeder['add'] = async ({ count, batch = 2000, on_progress }) => {
    const first = next
    next += count
    for (let start = first; start < first + count; start += batch) {
      const entries: unknown[] = []
      for (let index = start; index < Math.min(first + count, start + batch); index++) {
        const artist = index % ARTISTS
        const track = await put_track({
          target: track_target,
          content: {
            ...content,
            tags: {
              ...content.tags,
              acoustid_fingerprint: `seed-${index}-${String(content.tags.acoustid_fingerprint).slice(0, 64)}`,
              title: `Track ${index} ${TAGS[index % TAGS.length]} cut`,
              artist: `Artist ${artist}`,
              album: `Album ${artist}-${index % ALBUMS_PER_ARTIST}`,
              bpm: 90 + (index % 60)
            },
            audio: { ...content.audio, duration: 120 + (index % 400) }
          },
          tags: index % 3 === 0 ? [TAGS[index % TAGS.length] as string] : [],
          timestamp: 1_700_000_000_000 + index
        })
        const entry = target.handle.oplog.entries.get(track.entry_hash)
        if (entry !== undefined) entries.push(entry)
      }
      await libraries.register({ library_address: target.address, entries })
      on_progress?.(Math.min(first + count, start + batch) - first)
    }
  }
  return { library_address: target.address, add }
}
