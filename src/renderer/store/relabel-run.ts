// The relabel job's run: one rename, merge, facet move or delete across
// every label library the identity can write labels to. It collects every
// matching track per library before writing anything, since offset paging
// over a set the job is shrinking would skip rows, then writes in batches
// (relabel-plan.ts), checking for cancel between them. Add and remove items
// are idempotent, so a re-run after a cancel or an interruption finishes
// the rest. The node calls are injected (RelabelPorts), so this runs the
// same in the app (relabel-job.ts), in tests, and against an in-process node.

import type { Capability, Library, TagCount, TrackList } from '#renderer/api/types.ts'
import type { components } from '#renderer/api/generated-types.ts'
import { labels_library, write_targets, type WriteTarget } from '#renderer/library/write-targets.ts'
import type { NodeFailure } from '#shared/bridge.ts'
import { collected_track, relabel_batches, type CollectedTrack, type LabelBatch } from './relabel-batches.ts'
import { checked_mappings, collection_queries, covered_mappings, type LabelMapping } from './relabel-plan.ts'

export type LabelBatchResult = components['schemas']['LabelBatchResult']

export interface CollectPageArgs {
  label_libraries: string[]
  tag_groups: string
  offset: number
  limit: number
}

export type RelabelStatus = 'collecting' | 'writing' | 'finished' | 'cancelled' | 'interrupted'

export type SkipReason = 'managed' | 'refused' | 'retired' | 'capability_lost'

export interface SkippedLibrary { library_address: string, reason: SkipReason }
export interface UncoveredMappings { library_address: string, mappings: LabelMapping[] }
export interface FailedItem { library_address: string, track_id: string, message: string }

export interface RelabelState {
  status: RelabelStatus
  // Items planned and written, summed over libraries.
  total: number
  written: number
  updated: number
  failed_count: number
  // The first failures, for the toast to name; failed_count counts them all.
  failed: FailedItem[]
  skipped: SkippedLibrary[]
  uncovered: UncoveredMappings[]
  // Tracks still carrying a source in a library the job did not fully
  // write (linked, skipped, or a right that does not cover it); null until read.
  remaining: number | null
  // Why an interrupted job stopped.
  reason: string | null
  cancel_requested: boolean
}

// GET /tracks pages at most 500 rows.
const COLLECT_PAGE_SIZE = 500
const KEPT_FAILURES = 50

export type Outcome<T> = { ok: true, data: T } | { ok: false, failure: NodeFailure }

// The node calls the job makes, injected so tests can fake them.
export interface RelabelPorts {
  fetch_page: (args: CollectPageArgs) => Promise<Outcome<TrackList>>
  write_batch: (batch: LabelBatch) => Promise<Outcome<{ results: LabelBatchResult[] }>>
  // GET /tags counting one library's labels alone.
  count_tags: (args: { label_libraries: string[] }) => Promise<Outcome<TagCount[]>>
  cancelled: () => boolean
  progress: (update: Partial<RelabelState>) => void
}

const LOST_CAPABILITY = new Set(['CAPABILITY_REVOKED', 'CAPABILITY_EXPIRED'])

// The libraries a relabel writes to: the labels library first, then own
// active recordstores and shared ones held under library.write_label.
export const label_write_libraries = ({ own, libraries, held, now = Date.now() }: {
  own: readonly Library[]
  libraries: readonly Library[]
  held: readonly Capability[]
  now?: number
}): WriteTarget[] => {
  const labels = labels_library(own)
  // The own list first, so its entry wins for a library both list.
  const known = new Map([...libraries, ...own].map((library) => [library.address, library]))
  return [
    ...(labels === undefined ? [] : [{ library_address: labels.address, category: 'own' as const, capability_id: null }]),
    ...write_targets({ libraries: [...known.values()], held, action: 'library.write_label', now })
  ]
}

// Every library whose labels a view can count: all but the listens libraries.
export const label_holding_libraries = ({ own, libraries }: { own: readonly Library[], libraries: readonly Library[] }): string[] =>
  [...new Set([...own, ...libraries].flatMap(({ address, library_type }) => library_type === 'listens' ? [] : [address]))]

export const failure_text = (failure: NodeFailure): string =>
  failure.kind === 'http' ? `${failure.status} ${failure.message}` : failure.message

// The sources a library holds, and whether the node manages it: a
// node-managed library's labels come back managed, and it is never
// collected from or written to.
const holdings = async (ports: RelabelPorts, library_address: string): Promise<Outcome<{ labels: Set<string>, managed: boolean }>> => {
  const counts = await ports.count_tags({ label_libraries: [library_address] })
  return counts.ok ? { ok: true, data: { labels: new Set(counts.data.map(({ tag }) => tag)), managed: counts.data.some(({ managed }) => managed) } } : counts
}

// Every track the library labels with a source, each kept as its id and
// that library's labels; null when cancelled.
const collect = async (ports: RelabelPorts, library_address: string, mappings: readonly LabelMapping[]): Promise<Outcome<CollectedTrack[]> | null> => {
  const tracks = new Map<string, CollectedTrack>()
  for (const { tag_groups } of collection_queries({ label_libraries: [library_address], mappings })) {
    for (let offset = 0; ; offset += COLLECT_PAGE_SIZE) {
      if (ports.cancelled()) return null
      const page = await ports.fetch_page({ label_libraries: [library_address], tag_groups, offset, limit: COLLECT_PAGE_SIZE })
      if (!page.ok) return page
      for (const track of page.data.items) tracks.set(track.id, collected_track(track, library_address))
      if (page.data.items.length < COLLECT_PAGE_SIZE || offset + COLLECT_PAGE_SIZE >= page.data.total) break
    }
  }
  return { ok: true, data: [...tracks.values()] }
}

// How many tracks the given libraries still label with a source: each
// query's total, by exact label match. Exact while the sources fit one
// query (256 labels); past that a track in two chunks counts twice.
const remaining_count = async (ports: RelabelPorts, label_libraries: string[], mappings: readonly LabelMapping[]): Promise<number | null> => {
  if (label_libraries.length === 0) return 0
  let remaining = 0
  for (const { tag_groups } of collection_queries({ label_libraries, mappings })) {
    const page = await ports.fetch_page({ label_libraries, tag_groups, offset: 0, limit: 1 })
    if (!page.ok) return null
    remaining += page.data.total
  }
  return remaining
}

export const initial_state = (): RelabelState => ({
  status: 'collecting',
  total: 0,
  written: 0,
  updated: 0,
  failed_count: 0,
  failed: [],
  skipped: [],
  uncovered: [],
  remaining: null,
  reason: null,
  cancel_requested: false
})

// One relabel from start to its report. The caller resolves the libraries
// it writes (label_write_libraries) and every library holding labels
// (label_holding_libraries); a managed one is skipped here.
export const run_relabel = async ({ mappings, managed, targets, known_libraries, held, ports, now = Date.now() }: {
  mappings: readonly LabelMapping[]
  managed: ReadonlySet<string>
  targets: readonly WriteTarget[]
  known_libraries: readonly string[]
  held: readonly Capability[]
  ports: RelabelPorts
  now?: number
}): Promise<RelabelState> => {
  const checked = checked_mappings({ mappings, managed })
  const state = initial_state()
  const interrupt = (failure: NodeFailure): RelabelState => {
    state.status = 'interrupted'
    state.reason = failure_text(failure)
    return state
  }
  const cancel = (): RelabelState => {
    state.status = 'cancelled'
    return state
  }
  const fail = (library_address: string, track_id: string, message: string): void => {
    state.failed_count += 1
    if (state.failed.length < KEPT_FAILURES) state.failed.push({ library_address, track_id, message })
  }
  const failures = (): Partial<RelabelState> => ({ failed_count: state.failed_count, failed: [...state.failed] })
  // Libraries every covered source was written to, to the end.
  const cleared = new Set<string>()
  const plans: Array<{ target: WriteTarget, batches: LabelBatch[] }> = []
  for (const target of targets) {
    if (ports.cancelled()) return cancel()
    // Only the sources this library holds concern it.
    const holding = await holdings(ports, target.library_address)
    if (!holding.ok) return interrupt(holding.failure)
    const relevant = checked.mappings.filter(({ from_label }) => holding.data.labels.has(from_label))
    if (relevant.length === 0) {
      cleared.add(target.library_address)
      continue
    }
    if (holding.data.managed) {
      state.skipped.push({ library_address: target.library_address, reason: 'managed' })
      continue
    }
    const { covered, uncovered } = covered_mappings({ target, held, mappings: relevant, now })
    if (uncovered.length > 0) state.uncovered.push({ library_address: target.library_address, mappings: uncovered })
    if (covered.length === 0) continue
    const tracks = await collect(ports, target.library_address, covered)
    if (tracks === null) return cancel()
    if (!tracks.ok) return interrupt(tracks.failure)
    const { batches, refused } = relabel_batches({ target, held, mappings: covered, tracks: tracks.data, now })
    for (const { track_id, from_label } of refused) fail(target.library_address, track_id, `no capability lets you change ${from_label} on this track`)
    plans.push({ target, batches })
    if (uncovered.length === 0 && refused.length === 0) cleared.add(target.library_address)
    state.total += batches.reduce((sum, { items }) => sum + items.length, 0)
    ports.progress({ total: state.total, uncovered: [...state.uncovered], skipped: [...state.skipped], ...failures() })
  }
  state.status = 'writing'
  ports.progress({ status: 'writing', total: state.total })
  for (const { target, batches } of plans) {
    for (const batch of batches) {
      if (ports.cancelled()) return cancel()
      const result = await ports.write_batch(batch)
      if (!result.ok) {
        const { failure } = result
        // A one-item batch under a capability is refused whole for that item alone.
        if (failure.kind === 'http' && failure.status === 403 && batch.items.length === 1) {
          fail(target.library_address, batch.items[0]!.track_id, failure.message)
          cleared.delete(target.library_address)
          state.written += 1
          ports.progress({ written: state.written, ...failures() })
          continue
        }
        if (failure.kind === 'http' && (failure.status === 403 || failure.status === 409)) {
          state.skipped.push({ library_address: target.library_address, reason: failure.status === 403 ? 'refused' : 'retired' })
          cleared.delete(target.library_address)
          ports.progress({ skipped: [...state.skipped] })
          break
        }
        return interrupt(failure)
      }
      const { results } = result.data
      if (results.length > 0 && results.every(({ status, error }) => status === 'failed' && error !== undefined && LOST_CAPABILITY.has(error.code))) {
        state.skipped.push({ library_address: target.library_address, reason: 'capability_lost' })
        cleared.delete(target.library_address)
        ports.progress({ skipped: [...state.skipped] })
        break
      }
      const failed_before = state.failed_count
      for (const { track_id, status, error } of results) {
        if (status === 'updated') state.updated += 1
        else if (status === 'failed') fail(target.library_address, track_id, error?.message ?? 'failed')
      }
      if (state.failed_count > failed_before) cleared.delete(target.library_address)
      state.written += batch.items.length
      ports.progress({ written: state.written, updated: state.updated, ...(state.failed_count > failed_before ? failures() : {}) })
    }
  }
  state.remaining = await remaining_count(ports, known_libraries.filter((address) => !cleared.has(address)), checked.mappings)
  state.status = 'finished'
  return state
}
