// The Layer B hibernation snapshot (spec §8.8.3): the minimum to render the
// last-visited surface at launch, before any node query. It is stale by
// definition and is never a fallback for node data.

export const SNAPSHOT_VERSION = 1
export const MEBIBYTE = 1024 * 1024
export const DEFAULT_SNAPSHOT_BUDGET_BYTES = 50 * MEBIBYTE
export const MAX_SNAPSHOT_BUDGET_BYTES = 1024 * MEBIBYTE

// Spec fields for the active library's first track page.
export interface SnapshotTrack {
  id: string
  content_cid: string
  audio_cid: string
  audio_size_bytes: number
  title: string | null
  artist: string | null
  album: string | null
  duration_seconds: number | null
  tags: Array<{ library_address: string, tag: string }>
  listen_count: number
  have_track: boolean
}

export interface SnapshotQueueEntry {
  track_id: string
  audio_cid: string
  title: string | null
  artist: string | null
}

export interface HibernationSnapshot {
  version: typeof SNAPSHOT_VERSION
  node_url: string
  written_at_ms: number
  // Last-visited route, as the hash router path.
  route: string
  // The library list with its about fields. Never evicted.
  libraries: Array<Record<string, unknown>>
  // The first track page of the most recently active library ('' is the
  // aggregated view of all libraries). Evicted first when over budget.
  active: { library_address: string, total: number, tracks: SnapshotTrack[] } | null
  // The playback queue and position. The queue holds the current track
  // until the queue manager lands.
  queue: { entries: SnapshotQueueEntry[], index: number, position_seconds: number } | null
}

export interface SnapshotInfo {
  size_bytes: number
  budget_bytes: number
}
