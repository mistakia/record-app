// FilterSpec evaluation (spec §3.5.7) for the replication-policy editor's
// storage estimate: field paths resolve through maps, scalars compare by
// type and value, arrays match on any element, and a filter with anything
// this version does not define matches nothing (fail closed). The node is
// the authority on what a selective policy fetches; this only previews it.

import type { Track } from '#renderer/api/types.ts'
import { filter_problems, type FilterSpec, type Scalar } from './filter-spec.ts'

const resolve = (subject: unknown, path: string): unknown => {
  let value: unknown = subject
  for (const step of path.split('.')) {
    if (typeof value !== 'object' || value === null || Array.isArray(value) || !Object.hasOwn(value, step)) return undefined
    value = (value as Record<string, unknown>)[step]
  }
  return value
}

const equal = (a: unknown, b: Scalar): boolean => typeof a === typeof b && (a === b || (a === null && b === null))
const equal_or_contains = (value: unknown, scalar: Scalar): boolean =>
  Array.isArray(value) ? value.some((element) => equal(element, scalar)) : equal(value, scalar)

const holds = (spec: FilterSpec, subject: unknown): boolean => {
  switch (spec.type) {
    case 'match':
      return Object.entries(spec.fields).every(([path, scalar]) => {
        const value = resolve(subject, path)
        return value !== undefined && equal_or_contains(value, scalar)
      })
    case 'any_of': {
      const value = resolve(subject, spec.field)
      return value !== undefined && spec.values.some((scalar) => equal_or_contains(value, scalar))
    }
    case 'range': {
      const value = resolve(subject, spec.field)
      if (typeof value !== 'number') return false
      return (spec.gte === undefined || value >= spec.gte) && (spec.gt === undefined || value > spec.gt) &&
        (spec.lte === undefined || value <= spec.lte) && (spec.lt === undefined || value < spec.lt)
    }
    case 'and': return spec.filters.every((child) => holds(child, subject))
    case 'or': return spec.filters.some((child) => holds(child, subject))
    case 'not': return !holds(spec.filter, subject)
  }
}

export const evaluate_filter = (spec: unknown, subject: unknown): boolean =>
  filter_problems(spec).length === 0 && holds(spec as FilterSpec, subject)

// The §4.6.1 track view, as far as chapter 7's Track shows it: added_by is
// not exposed, and added_at is the node's first-seen time, not the envelope
// timestamp, so filters on those two preview loosely.
export const track_view = (track: Track, library_address: string): Record<string, unknown> => {
  const view: Record<string, unknown> = {
    library_address,
    tags: track.tags.filter((tag) => tag.library_address === library_address).map(({ tag }) => tag),
    cid: track.audio_cid,
    audio_size_bytes: track.audio_size_bytes,
    source: (track.resolvers ?? []).map((resolver) => (resolver as { extractor?: unknown }).extractor).filter((extractor) => typeof extractor === 'string')
  }
  if (track.added_at_ms !== undefined) view.added_at = track.added_at_ms
  if (track.duration_seconds !== null && track.duration_seconds !== undefined) view.duration_seconds = track.duration_seconds
  if (track.title !== null && track.title !== undefined) view.title = track.title
  if (track.artist !== null && track.artist !== undefined) view.artist = track.artist
  return view
}

export interface StorageEstimate {
  bytes: number
  // Whether bytes is the node's own total (full mode, or none kept) rather
  // than scaled from the sample.
  exact: boolean
  // How many sampled tracks the estimate rests on, and how many matched.
  sampled: number
  matched: number
}

// Audio a policy keeps for a library: the node's total (Library.
// audio_size_bytes) for full; for selective, that total scaled by the
// matching share of a sample's bytes; none for index_only (audio played is
// cached, then evicted). Without a complete total (an older node, or a
// library still replicating, whose total counts only the tracks arrived so
// far), the sample's mean size scaled by track_count. Null while there is
// no sample to go on.
export const estimate_storage = ({ mode, filter, sample, track_count, total_bytes, library_address }: {
  mode: 'full' | 'selective' | 'index_only'
  filter: unknown
  sample: readonly Track[] | undefined
  track_count: number
  total_bytes?: number | undefined
  library_address: string
}): StorageEstimate | null => {
  if (mode === 'index_only') return { bytes: 0, exact: true, sampled: sample?.length ?? 0, matched: 0 }
  if (mode === 'full' && total_bytes !== undefined) return { bytes: total_bytes, exact: true, sampled: 0, matched: 0 }
  if (sample === undefined) return null
  if (sample.length === 0) return track_count === 0 ? { bytes: 0, exact: true, sampled: 0, matched: 0 } : null
  const kept = mode === 'full' ? sample : sample.filter((track) => evaluate_filter(filter, track_view(track, library_address)))
  const kept_bytes = kept.reduce((sum, track) => sum + track.audio_size_bytes, 0)
  const sample_bytes = sample.reduce((sum, track) => sum + track.audio_size_bytes, 0)
  const bytes = total_bytes !== undefined
    ? (sample_bytes === 0 ? 0 : Math.round(total_bytes * kept_bytes / sample_bytes))
    : Math.round(kept_bytes / sample.length * Math.max(track_count, sample.length))
  return { bytes, exact: false, sampled: sample.length, matched: kept.length }
}

export const format_bytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000
    unit++
  }
  return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}
