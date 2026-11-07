// The relabel job against a fake node: collect then write per writable
// label library, cancel between batches, skip a library the node refuses,
// stop on anything else, and report what stays where it cannot write.

import { describe, expect, test } from 'bun:test'

import type { TagCount, Track } from '#renderer/api/types.ts'
import type { WriteTarget } from '#renderer/library/write-targets.ts'
import type { LabelBatchResult } from '#renderer/store/relabel-run.ts'
import { relabel_summary } from '#renderer/store/relabel-job.ts'
import { run_relabel, type Outcome, type RelabelPorts } from '#renderer/store/relabel-run.ts'
import type { LabelBatch } from '#renderer/store/relabel-batches.ts'
import type { NodeFailure } from '#shared/bridge.ts'

const LABELS = '/record/z/labels'
const STORE = '/record/z/store'
const FACETS = '/record/z/facets'
const LINKED = '/record/z/linked'

const own = (library_address: string): WriteTarget => ({ library_address, category: 'own', capability_id: null })

const track_id = (n: number): string => n.toString(16).padStart(64, '0')

// Libraries' label state: library -> track id -> labels.
type NodeState = Map<string, Map<string, Set<string>>>

const node_state = (spec: Record<string, Array<[number, string[]]>>): NodeState =>
  new Map(Object.entries(spec).map(([library, rows]) => [library, new Map(rows.map(([n, labels]) => [track_id(n), new Set(labels)]))]))

interface FakeOptions {
  managed_libraries?: string[]
  // Answers a batch instead of the fake node, by batch number from 0.
  on_batch?: (index: number, batch: LabelBatch) => Outcome<{ results: LabelBatchResult[] }> | undefined
  cancel_after?: number
  // Cancels once this many track pages were read.
  cancel_after_pages?: number
}

const fake = (state: NodeState, options: FakeOptions = {}) => {
  const managed_libraries = new Set(options.managed_libraries ?? [])
  const calls = { collected: [] as string[], batches: [] as LabelBatch[], pages: 0 }
  const counts = (libraries: string[]): TagCount[] => {
    const tracks = new Map<string, { count: Set<string>, managed: boolean }>()
    for (const library of libraries) {
      for (const [id, labels] of state.get(library) ?? []) {
        for (const label of labels) {
          const row = tracks.get(label) ?? { count: new Set<string>(), managed: false }
          row.count.add(id)
          row.managed ||= managed_libraries.has(library)
          tracks.set(label, row)
        }
      }
    }
    return [...tracks.entries()].map(([tag, { count, managed }]) => ({ tag, count: count.size, managed }))
  }
  const ports: RelabelPorts = {
    // Every track one of label_libraries labels with a wanted label, carrying
    // those libraries' labels, as the node answers.
    fetch_page: async ({ label_libraries, tag_groups, offset, limit }) => {
      // A one-row read is the remaining count, not collection.
      if (limit > 1) {
        calls.collected.push(...label_libraries)
        calls.pages += 1
      }
      const wanted = new Set((JSON.parse(tag_groups) as string[][])[0])
      const tags = new Map<string, Track['tags']>()
      for (const library of label_libraries) {
        for (const [id, labels] of state.get(library) ?? []) tags.set(id, [...tags.get(id) ?? [], ...[...labels].map((tag) => ({ library_address: library, tag }))])
      }
      const items: Track[] = [...tags.entries()]
        .filter(([, labels]) => labels.some(({ tag }) => wanted.has(tag)))
        .map(([id, labels]) => ({ id, library_addresses: [], content_cid: 'c', audio_cid: 'a', audio_size_bytes: 0, tags: labels, listen_count: 0, have_track: false }))
      return { ok: true, data: { items: items.slice(offset, offset + limit), total: items.length } }
    },
    write_batch: async (batch) => {
      const index = calls.batches.length
      calls.batches.push(batch)
      const answered = options.on_batch?.(index, batch)
      if (answered !== undefined) return answered
      const library = state.get(batch.library_address)!
      const results = batch.items.map(({ track_id: id, add = [], remove = [] }): LabelBatchResult => {
        const labels = library.get(id) ?? new Set<string>()
        const before = [...labels].sort().join()
        for (const label of remove) labels.delete(label)
        for (const label of add) labels.add(label)
        library.set(id, labels)
        return { track_id: id, status: before === [...labels].sort().join() ? 'unchanged' : 'updated' }
      })
      return { ok: true, data: { results } }
    },
    count_tags: async ({ label_libraries }) => ({ ok: true, data: counts(label_libraries) }),
    cancelled: () => (options.cancel_after !== undefined && calls.batches.length >= options.cancel_after) ||
      (options.cancel_after_pages !== undefined && calls.pages >= options.cancel_after_pages),
    progress: () => {}
  }
  return { ports, calls }
}

const http = (status: number): Outcome<never> => ({ ok: false, failure: { kind: 'http', status, code: null, message: `status ${status}` } })

// 250 tracks each labelled `chill` in the labels library: two batches.
const many = (count: number, label: string): Array<[number, string[]]> => Array.from({ length: count }, (_, n): [number, string[]] => [n, [label]])

const run = (state: NodeState, targets: WriteTarget[], options: FakeOptions = {}, mappings = [{ from_label: 'chill', to_label: 'calm' }]) => {
  const { ports, calls } = fake(state, options)
  return run_relabel({ mappings, managed: new Set(), targets, known_libraries: [...state.keys()], held: [], ports }).then((report) => ({ report, calls }))
}

describe('run_relabel', () => {
  test('renames across the labels library and an own recordstore, and reports nothing left', async () => {
    const state = node_state({ [LABELS]: [[1, ['chill', 'jazz']]], [STORE]: [[2, ['chill']]] })
    const { report } = await run(state, [own(LABELS), own(STORE)])
    expect(report).toMatchObject({ status: 'finished', total: 2, written: 2, updated: 2, failed: [], skipped: [], remaining: 0 })
    expect([...state.get(LABELS)!.get(track_id(1))!].sort()).toEqual(['calm', 'jazz'])
  })

  test('cancel stops after the current batch', async () => {
    const state = node_state({ [LABELS]: many(250, 'chill') })
    const { report, calls } = await run(state, [own(LABELS)], { cancel_after: 1 })
    expect(report.status).toBe('cancelled')
    expect(calls.batches.length).toBe(1)
    expect(report).toMatchObject({ total: 250, written: 200 })
  })

  test('a second run over the leftovers finishes, and a third changes nothing', async () => {
    const state = node_state({ [LABELS]: many(250, 'chill') })
    await run(state, [own(LABELS)], { cancel_after: 1 })
    const second = await run(state, [own(LABELS)])
    expect(second.report).toMatchObject({ status: 'finished', updated: 50, remaining: 0 })
    const third = await run(state, [own(LABELS)])
    expect(third.report).toMatchObject({ status: 'finished', total: 0, updated: 0 })
  })

  test('a failed item is reported and the job goes on', async () => {
    const state = node_state({ [LABELS]: [[1, ['chill']], [2, ['chill']]] })
    const { report } = await run(state, [own(LABELS)], {
      on_batch: (_index, batch) => ({ ok: true, data: { results: batch.items.map(({ track_id: id }, n) => n === 0 ? { track_id: id, status: 'failed' as const, error: { code: 'VALIDATION_ERROR' as const, message: 'bad' } } : { track_id: id, status: 'updated' as const }) } })
    })
    expect(report.status).toBe('finished')
    expect(report.updated).toBe(1)
    expect(report.failed).toEqual([{ library_address: LABELS, track_id: track_id(1), message: 'bad' }])
  })

  test('the write gate closing interrupts the job', async () => {
    const state = node_state({ [LABELS]: [[1, ['chill']]] })
    const refused: NodeFailure = { kind: 'refused', message: 'Writes wait until the app has caught up with the node.' }
    const { report } = await run(state, [own(LABELS)], { on_batch: () => ({ ok: false, failure: refused }) })
    expect(report).toMatchObject({ status: 'interrupted', reason: refused.message })
    expect(relabel_summary(report)).toContain('run it again to finish')
  })

  test('a node error or timeout interrupts the job', async () => {
    const state = node_state({ [LABELS]: [[1, ['chill']], [2, ['chill']]] })
    const { report } = await run(state, [own(LABELS)], { on_batch: () => http(500) })
    expect(report.status).toBe('interrupted')
  })

  test('a managed library is never collected from or written to', async () => {
    const state = node_state({ [FACETS]: [[1, ['chill']]], [LABELS]: [[2, ['chill']]] })
    const { report, calls } = await run(state, [own(FACETS), own(LABELS)], { managed_libraries: [FACETS] })
    expect(calls.collected).not.toContain(FACETS)
    expect(calls.batches.every(({ library_address }) => library_address !== FACETS)).toBe(true)
    expect(report.skipped).toEqual([{ library_address: FACETS, reason: 'managed' }])
    expect(state.get(FACETS)!.get(track_id(1))).toEqual(new Set(['chill']))
  })

  test('a 403 on one library skips only it, and a 409 names it retired', async () => {
    const state = node_state({ [STORE]: [[1, ['chill']], [2, ['chill']]], [LINKED]: [[3, ['chill']], [4, ['chill']]], [LABELS]: [[5, ['chill']]] })
    const { report } = await run(state, [own(STORE), own(LINKED), own(LABELS)], {
      on_batch: (_index, batch) => batch.library_address === STORE ? http(403) : batch.library_address === LINKED ? http(409) : undefined
    })
    expect(report.status).toBe('finished')
    expect(report.skipped).toEqual([{ library_address: STORE, reason: 'refused' }, { library_address: LINKED, reason: 'retired' }])
    expect(report.updated).toBe(1)
  })

  test('a capability revoked mid-job skips only that library', async () => {
    const state = node_state({ [STORE]: many(250, 'chill'), [LABELS]: [[999, ['chill']]] })
    const { report, calls } = await run(state, [own(STORE), own(LABELS)], {
      on_batch: (index, batch) => batch.library_address === STORE && index === 1
        ? { ok: true, data: { results: batch.items.map(({ track_id: id }) => ({ track_id: id, status: 'failed' as const, error: { code: 'CAPABILITY_REVOKED' as const, message: 'revoked' } })) } }
        : undefined
    })
    expect(report.status).toBe('finished')
    expect(report.skipped).toEqual([{ library_address: STORE, reason: 'capability_lost' }])
    expect(report.updated).toBe(201)
    expect(calls.batches.map(({ library_address }) => library_address)).toEqual([STORE, STORE, LABELS])
  })

  test('a single-item batch refused with 403 counts as one failed item', async () => {
    const state = node_state({ [STORE]: [[1, ['chill']]], [LABELS]: [[2, ['chill']]] })
    const { report } = await run(state, [own(STORE), own(LABELS)], { on_batch: (_index, batch) => batch.library_address === STORE ? http(403) : undefined })
    expect(report.skipped).toEqual([])
    expect(report.failed).toEqual([{ library_address: STORE, track_id: track_id(1), message: 'status 403' }])
    expect(report.updated).toBe(1)
  })

  test('the remaining count matches chill exactly, ignoring chillwave, in libraries it did not write', async () => {
    const state = node_state({ [LABELS]: [[1, ['chill']]], [LINKED]: [[2, ['chill']], [3, ['chillwave']], [4, ['chill', 'chillwave']]] })
    const { report } = await run(state, [own(LABELS)])
    expect(report.remaining).toBe(2)
    expect(relabel_summary(report)).toContain('2 tracks keep the label where it could not change')
  })

  test('a label absent from every library counts zero', async () => {
    const state = node_state({ [LABELS]: [[1, ['jazz']]] })
    const { report } = await run(state, [own(LABELS)])
    expect(report).toMatchObject({ status: 'finished', total: 0, remaining: 0 })
  })

  test('the remaining count is distinct tracks: one carrying two sources counts once', async () => {
    const state = node_state({ [LABELS]: [[1, ['mix/a', 'mix/b']]], [LINKED]: [[2, ['mix/a', 'mix/b']], [3, ['mixtape']]] })
    const { report } = await run(state, [own(LABELS)], {}, [{ from_label: 'mix/a', to_label: 'set/a' }, { from_label: 'mix/b', to_label: 'set/b' }])
    expect(report).toMatchObject({ status: 'finished', updated: 1, remaining: 1 })
  })

  test('cancel stops collection before the next library is read', async () => {
    const state = node_state({ [LABELS]: [[1, ['chill']]], [STORE]: [[2, ['chill']]] })
    const { report, calls } = await run(state, [own(LABELS), own(STORE)], { cancel_after_pages: 1 })
    expect(report.status).toBe('cancelled')
    expect(calls.collected).toEqual([LABELS])
    expect(calls.batches).toEqual([])
  })

  test('the summary names each skipped and uncovered library and why', async () => {
    const state = node_state({ [FACETS]: [[1, ['chill']]], [LABELS]: [[2, ['chill']]] })
    const { report } = await run(state, [own(FACETS), own(LABELS)], { managed_libraries: [FACETS] })
    const names: Record<string, string> = { [FACETS]: 'Facets' }
    expect(relabel_summary(report, (address) => names[address] ?? address)).toContain('Facets skipped: the node manages it')
  })

  test('a library holding none of the sources is neither skipped nor named', async () => {
    const state = node_state({ [FACETS]: [[1, ['view/x']]], [LABELS]: [[2, ['chill']]] })
    const { report, calls } = await run(state, [own(FACETS), own(LABELS)], { managed_libraries: [FACETS] })
    expect(report).toMatchObject({ status: 'finished', updated: 1, skipped: [], uncovered: [] })
    expect(calls.collected).toEqual([LABELS])
  })

  test('a failure list past fifty keeps fifty and counts them all', async () => {
    const state = node_state({ [LABELS]: many(120, 'chill') })
    const { report } = await run(state, [own(LABELS)], {
      on_batch: (_index, batch) => ({ ok: true, data: { results: batch.items.map(({ track_id: id }) => ({ track_id: id, status: 'failed' as const, error: { code: 'VALIDATION_ERROR' as const, message: 'bad' } })) } })
    })
    expect(report.failed_count).toBe(120)
    expect(report.failed.length).toBe(50)
    expect(relabel_summary(report)).toContain('120 items failed')
  })
})
