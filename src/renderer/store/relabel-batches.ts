// The relabel job's writes: each collected track's item from its labels in
// the target library, and the batches POST /tags/batch accepts, bounded by
// the node's item cap, its body limit and the signed-entry bound. Pure.

import type { Capability, Track } from '#renderer/api/types.ts'
import type { WriteTarget } from '#renderer/library/write-targets.ts'
import { mapping_capability, utf8_bytes, type LabelMapping } from './relabel-plan.ts'

// POST /tags/batch takes at most 200 items. The body stays under the node's
// 100 kB JSON limit, and the pairs under the 256 KiB signed-entry bound at
// about 200 bytes of dag-cbor each.
export const BATCH_LIMITS = { items: 200, body_bytes: 64 * 1024, pairs: 1000 } as const

// A collected track: its id and the labels the target library applies to it.
export interface CollectedTrack {
  id: string
  labels: string[]
}

// Only what a write needs from a GET /tracks row (Track.tags entries whose
// library is the target), so a large collection holds little.
export const collected_track = (track: Pick<Track, 'id' | 'tags'>, library_address: string): CollectedTrack => ({
  id: track.id,
  labels: [...new Set(track.tags.flatMap(({ library_address: holder, tag }) => holder === library_address ? [tag] : []))]
})

export interface LabelBatchItem {
  track_id: string
  add?: string[]
  remove?: string[]
}

export interface LabelBatch {
  library_address: string
  // Null for an own library.
  capability_id: string | null
  items: LabelBatchItem[]
}

// A source a track carries that no held capability lets this library's
// write change for that track.
export interface RefusedPair {
  track_id: string
  from_label: string
}

const item_pairs = ({ add = [], remove = [] }: LabelBatchItem): number => add.length + remove.length
const item_bytes = (item: LabelBatchItem): number => utf8_bytes(JSON.stringify(item))

// One track's change, from the mappings it carries: remove each source, add
// each target once.
const track_item = (track_id: string, mappings: readonly LabelMapping[]): LabelBatchItem => {
  const remove = mappings.map(({ from_label }) => from_label)
  const add = [...new Set(mappings.flatMap(({ to_label }) => to_label === null ? [] : [to_label]))]
  return { track_id, ...(add.length === 0 ? {} : { add }), remove }
}

// An item too big for one batch, split by mapping into items that fit. A
// target is added with the first piece carrying it; adding twice is harmless.
const fitting_items = (track_id: string, mappings: readonly LabelMapping[], room: number): LabelBatchItem[] => {
  const whole = track_item(track_id, mappings)
  if (item_pairs(whole) <= BATCH_LIMITS.pairs && item_bytes(whole) <= room) return [whole]
  const items: LabelBatchItem[] = []
  let piece: LabelMapping[] = []
  for (const mapping of mappings) {
    const next = track_item(track_id, [...piece, mapping])
    if (piece.length > 0 && (item_pairs(next) > BATCH_LIMITS.pairs || item_bytes(next) > room)) {
      items.push(track_item(track_id, piece))
      piece = [mapping]
    } else {
      piece.push(mapping)
    }
  }
  if (piece.length > 0) items.push(track_item(track_id, piece))
  return items
}

// The batches that relabel a library's collected tracks: tracks with nothing
// to change omitted, one capability per batch, and no track twice in a batch
// (a track's split items arrive one after another).
export const relabel_batches = ({ target, held, mappings, tracks, now = Date.now() }: {
  target: WriteTarget
  held: readonly Capability[]
  mappings: readonly LabelMapping[]
  tracks: readonly CollectedTrack[]
  now?: number
}): { batches: LabelBatch[], refused: RefusedPair[] } => {
  const by_source = new Map(mappings.map((mapping) => [mapping.from_label, mapping]))
  const refused: RefusedPair[] = []
  // Items grouped by the capability they cite, '' for none.
  const groups = new Map<string, Array<{ track_id: string, mappings: LabelMapping[] }>>()
  for (const track of tracks) {
    const carried = track.labels.flatMap((label) => by_source.get(label) ?? [])
    const per_capability = new Map<string, LabelMapping[]>()
    for (const mapping of carried) {
      const cited = mapping_capability({ target, held, mapping, track_id: track.id, now })
      if (cited === null) {
        refused.push({ track_id: track.id, from_label: mapping.from_label })
        continue
      }
      const key = cited.capability_id ?? ''
      const same = per_capability.get(key)
      if (same === undefined) per_capability.set(key, [mapping])
      else same.push(mapping)
    }
    for (const [key, track_mappings] of per_capability) {
      const entry = { track_id: track.id, mappings: track_mappings }
      const group = groups.get(key)
      if (group === undefined) groups.set(key, [entry])
      else group.push(entry)
    }
  }
  const batches: LabelBatch[] = []
  for (const [key, entries] of groups) {
    const capability_id = key === '' ? null : key
    const envelope = { items: [] as LabelBatchItem[], library_address: target.library_address, ...(capability_id === null ? {} : { capability_id }) }
    const empty_bytes = utf8_bytes(JSON.stringify(envelope))
    const room = BATCH_LIMITS.body_bytes - empty_bytes
    let batch: LabelBatchItem[] = []
    let bytes = empty_bytes
    let pairs = 0
    const close = (): void => {
      if (batch.length > 0) batches.push({ library_address: target.library_address, capability_id, items: batch })
      batch = []
      bytes = empty_bytes
      pairs = 0
    }
    for (const { track_id, mappings: track_mappings } of entries) {
      for (const item of fitting_items(track_id, track_mappings, room)) {
        // One more item adds its bytes and a comma.
        const size = item_bytes(item)
        if (batch.length === BATCH_LIMITS.items || bytes + size + 1 > BATCH_LIMITS.body_bytes || pairs + item_pairs(item) > BATCH_LIMITS.pairs || batch.at(-1)?.track_id === track_id) close()
        bytes += size + (batch.length === 0 ? 0 : 1)
        pairs += item_pairs(item)
        batch.push(item)
      }
    }
    close()
  }
  return { batches, refused }
}
