// The Tags page's relabel job in the app: a `relabel` slice holding one
// job's progress and report, and the thunk that runs it (relabel-run.ts)
// through the node API. One job runs at a time and survives navigating
// away. The slice is client state, outside the hibernation snapshot: a quit
// mid-job leaves the remainder for a re-run.

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { NodeFailure } from '#shared/bridge.ts'
import { library_name_at } from '#renderer/components/library/library-category.ts'
import { node_api } from './api.ts'
import { label_batch_api } from './label-batch.ts'
import { notified } from './notifications.ts'
import type { LabelMapping } from './relabel-plan.ts'
import { failure_text, initial_state, label_holding_libraries, label_write_libraries, run_relabel, type Outcome, type RelabelState, type RelabelStatus, type SkipReason } from './relabel-run.ts'
import type { AppDispatch, RootState } from './index.ts'

export const relabel_slice = createSlice({
  name: 'relabel',
  initialState: { job: null as RelabelState | null },
  reducers: {
    relabel_started: (state) => {
      state.job = initial_state()
    },
    relabel_progressed: (state, action: PayloadAction<Partial<RelabelState>>) => {
      if (state.job !== null) Object.assign(state.job, action.payload)
    },
    relabel_cancel_requested: (state) => {
      if (state.job !== null) state.job.cancel_requested = true
    },
    relabel_ended: (state, action: PayloadAction<RelabelState>) => {
      state.job = action.payload
    },
    relabel_dismissed: (state) => {
      state.job = null
    }
  }
})

export const { relabel_started, relabel_progressed, relabel_cancel_requested, relabel_ended, relabel_dismissed } = relabel_slice.actions

export const RUNNING: ReadonlySet<RelabelStatus> = new Set(['collecting', 'writing'])

export const select_relabel = (state: { relabel: { job: RelabelState | null } }): RelabelState | null => state.relabel.job

const plural = (count: number, one: string, many = `${one}s`): string => `${count} ${count === 1 ? one : many}`

const SKIP_REASONS: Record<SkipReason, string> = {
  managed: 'the node manages it',
  refused: 'the node refused the write',
  retired: 'it is retired',
  capability_lost: 'your right was revoked or expired'
}

// The toast's line for an ended job: what changed, then what did not, each
// library by name.
export const relabel_summary = (job: RelabelState, name_of: (address: string) => string = (address) => address): string => {
  const heads: Record<RelabelStatus, string> = {
    collecting: 'Relabel collecting',
    writing: 'Relabel writing',
    finished: `Relabelled ${plural(job.updated, 'track')}`,
    cancelled: 'Relabel cancelled',
    interrupted: `Relabel stopped: ${job.reason ?? 'the node did not answer'}`
  }
  const parts = [heads[job.status]]
  if (job.failed_count > 0) parts.push(`${plural(job.failed_count, 'item')} failed`)
  for (const { library_address, reason } of job.skipped) parts.push(`${name_of(library_address)} skipped: ${SKIP_REASONS[reason]}`)
  for (const { library_address } of job.uncovered) parts.push(`${name_of(library_address)} not covered by your right`)
  if (job.remaining !== null && job.remaining > 0) parts.push(`${plural(job.remaining, 'track')} keep the label where it could not change`)
  if (job.status !== 'finished') parts.push('run it again to finish')
  return parts.join('. ') + '.'
}

// A request's result as an outcome; the base query's error is a NodeFailure.
const settle = async <T>(request: { unwrap: () => Promise<T> }): Promise<Outcome<T>> => {
  try {
    return { ok: true, data: await request.unwrap() }
  } catch (error) {
    return { ok: false, failure: error as NodeFailure }
  }
}

// Runs one relabel; false when one is already running.
export const start_relabel = ({ mappings, managed }: { mappings: readonly LabelMapping[], managed: ReadonlySet<string> }) =>
  async (dispatch: AppDispatch, get_state: () => RootState): Promise<boolean> => {
    const running = select_relabel(get_state())
    if (running !== null && RUNNING.has(running.status)) return false
    dispatch(relabel_started())
    const [own, libraries, held] = await Promise.all([
      settle(dispatch(node_api.endpoints.get_own_libraries.initiate(undefined, { subscribe: false }))),
      settle(dispatch(node_api.endpoints.get_libraries.initiate(undefined, { subscribe: false }))),
      settle(dispatch(node_api.endpoints.get_held_capabilities.initiate(undefined, { subscribe: false })))
    ])
    let job: RelabelState
    if (!own.ok || !libraries.ok || !held.ok) {
      const failure = [own, libraries, held].flatMap((outcome) => outcome.ok ? [] : [outcome.failure])[0]!
      job = { ...select_relabel(get_state())!, status: 'interrupted', reason: failure_text(failure) }
    } else {
      job = await run_relabel({
        mappings,
        managed,
        targets: label_write_libraries({ own: own.data, libraries: libraries.data, held: held.data }),
        known_libraries: label_holding_libraries({ own: own.data, libraries: libraries.data }),
        held: held.data,
        ports: {
          fetch_page: (args) => settle(dispatch(label_batch_api.endpoints.collect_track_page.initiate(args, { track: false }))),
          write_batch: (batch) => settle(dispatch(label_batch_api.endpoints.change_labels_batch.initiate(batch, { track: false }))),
          count_tags: (args) => settle(dispatch(node_api.endpoints.get_tags.initiate(args, { subscribe: false, forceRefetch: true }))),
          cancelled: () => select_relabel(get_state())?.cancel_requested ?? false,
          progress: (update) => dispatch(relabel_progressed(update))
        }
      })
    }
    dispatch(relabel_ended({ ...job, cancel_requested: false }))
    dispatch(node_api.util.invalidateTags(['tracks', 'tags']))
    dispatch(notified({ kind: job.status === 'finished' && job.failed_count === 0 ? 'info' : 'error', title: 'relabel', message: relabel_summary(job, (address) => library_name_at(address, [...own.ok ? own.data : [], ...libraries.ok ? libraries.data : []])), key: 'relabel' }))
    return true
  }
