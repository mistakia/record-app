// The Tags page's confirm (STYLE.md § Tags page): the exact labels captured
// when it opened, then one row per fact that applies, as the inspector's
// fields: the tracks it changes (a per-library sum, since the aggregate
// counts a track two libraries label once) and in which libraries, the
// label a merge joins, a facet move, copies it cannot reach (a shared
// right that does not cover it, libraries the identity cannot write),
// managed labels skipped, and that a scope narrows the view, not the change.
// Confirming starts the relabel job.

import { useMemo, useState } from 'react'

import styles from './relabel-dialog.module.css'
import { managed_labels, shown_label, type RelabelRequest } from './tag-index-rows.ts'
import type { LabelLibraries } from './use-label-libraries.ts'
import type { TagCount } from '#renderer/api/types.ts'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { DialogActions } from '#renderer/components/common/dialog-actions.tsx'
import { library_name_at } from '#renderer/components/library/library-category.ts'
import { suggest_tags } from '#renderer/components/track/tag-suggest.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { label_facet } from '#renderer/store/label-facets.ts'
import { RUNNING, select_relabel, start_relabel } from '#renderer/store/relabel-job.ts'
import { checked_mappings, covered_mappings, prefix_mappings, type LabelMapping, type RefusalReason } from '#renderer/store/relabel-plan.ts'

const REFUSALS: Record<RefusalReason, string> = {
  chain: 'the new name is one of the labels being renamed',
  conflicting_targets: 'a label is given two new names',
  managed_source: 'the node manages it',
  managed_target: 'the new name is a label the node manages',
  empty_target: 'the new name is empty',
  target_too_long: 'the new name is over 128 bytes',
  control_character: 'the new name holds a control character'
}

// The field's text as a label: trimmed, inner whitespace collapsed, case
// kept. A name offered at open (a near-duplicate's target) stays exact
// until edited, since it may differ from another label only in spacing.
const typed_label = (text: string, offered: string): string => text === offered ? offered : text.trim().replace(/\s+/g, ' ')

// The mappings a request and the name make. A facet prefix left empty makes
// its labels hand labels.
const request_mappings = (request: RelabelRequest, name: string): LabelMapping[] => {
  switch (request.kind) {
    case 'delete': return request.labels.map((from_label) => ({ from_label, to_label: null }))
    case 'rename': return request.labels.map((from_label) => ({ from_label, to_label: name }))
    case 'rename_facet': return prefix_mappings({ labels: request.labels, from_prefix: request.facet, to_prefix: name.replace(/\/+$/, '') })
  }
}

// A rename is a merge when several labels become one, or one joins a label
// that exists; a merge cannot be undone.
const title_of = (request: RelabelRequest, merging: boolean): string => {
  if (request.kind === 'delete') return request.labels.length === 1 ? 'Delete label' : `Delete ${request.labels.length} labels`
  if (request.kind === 'rename_facet') return `Rename facet: ${request.facet}`
  if (!merging) return 'Rename label'
  return request.labels.length > 1 ? `Merge ${request.labels.length} labels` : 'Merge labels'
}

// The facets a change moves labels from and to (null: hand labels), or
// null when it keeps them where they are.
interface FacetMove { from: Array<string | null>, to: string | null }

const facet_move = (request: RelabelRequest, sources: ReadonlySet<string>, name: string): FacetMove | null => {
  if (request.kind === 'rename_facet') {
    const to = name === '' ? null : name
    return to === request.facet ? null : { from: [request.facet], to }
  }
  if (request.kind !== 'rename' || name === '' || sources.size === 0) return null
  const from = new Set([...sources].map(label_facet))
  const to = label_facet(name)
  return from.size === 1 && from.has(to) ? null : { from: [...from], to }
}

const facet_name = (facet: string | null): string => facet ?? 'hand labels'

// Up to three names, then how many more.
const name_list = (names: readonly string[]): string =>
  names.length <= 3 ? names.map(shown_label).join(', ') : `${names.slice(0, 3).map(shown_label).join(', ')} and ${names.length - 3} more`

// What a shared library's right does not let the change do there.
const uncovered_reason = (mappings: readonly LabelMapping[]): string => {
  const targets = [...new Set(mappings.flatMap(({ to_label }) => to_label === null ? [] : [to_label]))]
  return targets.length === 0 ? 'your right there does not cover removing it' : `your right there does not cover ${name_list(targets)}`
}

// Everything the dialog says about a change, from the request and the name.
const relabel_preview = ({ request, name, counts, label_libraries }: {
  request: RelabelRequest
  name: string
  counts: readonly TagCount[]
  label_libraries: LabelLibraries
}) => {
  const managed = managed_labels(counts)
  const count_of = new Map(counts.map(({ tag, count }) => [tag, count]))
  const { mappings, refused } = checked_mappings({ mappings: request_mappings(request, name), managed })
  const sources = new Set(mappings.map(({ from_label }) => from_label))
  // Per writable library, the mappings for sources it holds, split by
  // whether its right covers them; the tracks the covered ones change; and
  // per source, the tracks the writable libraries label with it, which the
  // dialog accounts for (changed, or kept and named as uncovered).
  const per_library: Array<{ library_address: string, tracks: number }> = []
  const uncovered: Array<{ library_address: string, mappings: LabelMapping[] }> = []
  const writable_count = new Map<string, number>()
  for (const target of label_libraries.writable) {
    const held_counts = new Map((label_libraries.counts[target.library_address] ?? []).flatMap(({ tag, count }) => sources.has(tag) ? [[tag, count] as const] : []))
    if (held_counts.size === 0) continue
    const relevant = mappings.filter(({ from_label }) => held_counts.has(from_label))
    const { covered, uncovered: left } = covered_mappings({ target, held: label_libraries.held, mappings: relevant })
    if (left.length > 0) uncovered.push({ library_address: target.library_address, mappings: left })
    for (const { from_label } of left) writable_count.set(from_label, (writable_count.get(from_label) ?? 0) + (held_counts.get(from_label) ?? 0))
    let tracks = 0
    for (const { from_label } of covered) {
      const count = held_counts.get(from_label) ?? 0
      tracks += count
      writable_count.set(from_label, (writable_count.get(from_label) ?? 0) + count)
    }
    if (tracks > 0) per_library.push({ library_address: target.library_address, tracks })
  }
  const renaming = request.kind === 'rename' && name !== '' && mappings.length > 0
  const merges_into = renaming && count_of.has(name) && !sources.has(name) ? name : null
  return {
    mappings,
    managed,
    refused,
    count_of,
    per_library,
    tracks: per_library.reduce((sum, { tracks: each }) => sum + each, 0),
    uncovered,
    // A label applying to more tracks than the writable libraries label with
    // it is held somewhere the change cannot reach. A copy on a track a
    // writable library also labels goes unseen here; the job's report counts it.
    elsewhere: [...sources].filter((label) => (count_of.get(label) ?? 0) > (writable_count.get(label) ?? 0)),
    merges_into,
    merging: request.kind === 'rename' && (merges_into !== null || request.labels.length > 1),
    move: mappings.length === 0 ? null : facet_move(request, sources, request.kind === 'rename_facet' ? name.replace(/\/+$/, '') : name),
    // Managed labels left out, whether the index or the plan left them.
    skipped: [...new Set([...request.left_out, ...refused.flatMap(({ mapping, reason }) => reason === 'managed_source' ? [mapping.from_label] : [])])],
    suggestions: request.kind === 'rename' ? suggest_tags({ query: name, tags: counts.filter(({ managed: is_managed }) => !is_managed), exclude: [...sources] }) : []
  }
}

export const RelabelDialog = ({ request, initial_name = '', counts, label_libraries, scoped, on_close }: {
  request: RelabelRequest
  initial_name?: string
  // Every label, unscoped, with its aggregate count.
  counts: readonly TagCount[]
  label_libraries: LabelLibraries
  scoped: boolean
  on_close: () => void
}) => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const running = use_app_selector((state) => {
    const job = select_relabel(state)
    return job !== null && RUNNING.has(job.status)
  })
  const offered = request.kind === 'rename_facet' ? request.facet : initial_name
  const [typed, set_typed] = useState(offered)
  const name = typed_label(typed, offered)
  const is_delete = request.kind === 'delete'
  const preview = useMemo(() => relabel_preview({ request, name, counts, label_libraries }), [request, name, counts, label_libraries])
  // Why the confirm is disabled, in words (STYLE.md § Interaction States › Gated).
  let block: string | null = null
  if (!writes_allowed) block = 'Waiting for the node.'
  else if (running) block = 'A relabel is already running.'
  else if (!label_libraries.has_labels_library) block = 'Your identity has no labels library, so labels cannot change here.'
  else if (request.kind === 'rename' && name === '') block = 'Type the new name.'
  else if (preview.refused.some(({ reason }) => reason !== 'managed_source')) block = 'Fix the name first.'
  else if (preview.mappings.length === 0) block = preview.skipped.length > 0 ? 'Nothing to change: the node manages these labels.' : 'Nothing would change.'
  let confirm_label = 'Rename'
  if (is_delete) confirm_label = 'Delete'
  else if (preview.merging) confirm_label = 'Merge'

  const confirm = (): void => {
    dispatch(start_relabel({ mappings: preview.mappings, managed: preview.managed })).catch(() => {})
    on_close()
  }

  return (
    <Dialog open title={title_of(request, preview.merging)} on_close={on_close}>
      <form className={styles.dialog} data-testid='relabel-dialog' onSubmit={(event) => { event.preventDefault(); if (block === null) confirm() }}>
        <ul className={styles.labels} aria-label='Labels'>
          {request.labels.map((label) => <li key={label}><code>{shown_label(label)}</code> <span className={styles.count}>{preview.count_of.get(label) ?? 0}</span></li>)}
        </ul>
        {!is_delete && (
          <label className={styles.field}>
            <span className={styles.field_label}>
              {request.kind === 'rename_facet' ? 'New prefix' : 'New name'}
              {request.kind === 'rename_facet' && <span className={styles.qualifier}> empty makes them hand labels</span>}
            </span>
            <input
              type='text'
              list='relabel-suggestions'
              value={typed}
              autoFocus={!is_delete}
              spellCheck={false}
              autoComplete='off'
              data-testid='relabel-name'
              onChange={(event) => { set_typed(event.target.value) }}
            />
            <datalist id='relabel-suggestions'>{preview.suggestions.map(({ tag }) => <option key={tag} value={tag} />)}</datalist>
          </label>
        )}
        {preview.mappings.length > 0 && (
          <dl className={styles.facts} data-testid='relabel-scope'>
            <dt>Tracks</dt>
            <dd>{preview.tracks}</dd>
            {preview.per_library.length > 0 && (
              <>
                <dt>In</dt>
                <dd>{preview.per_library.map(({ library_address, tracks }) => <span key={library_address}>{library_name_at(library_address, label_libraries.known)} <span className={styles.count}>{tracks}</span></span>)}</dd>
              </>
            )}
            {preview.merges_into !== null && (
              <>
                <dt>Into</dt>
                <dd><code>{shown_label(preview.merges_into)}</code> <span className={styles.count}>{preview.count_of.get(preview.merges_into)} now</span></dd>
              </>
            )}
            {preview.move !== null && (
              <>
                <dt>Facet</dt>
                <dd>{preview.move.from.map(facet_name).join(', ')} <span className={styles.count}>→</span> {facet_name(preview.move.to)}</dd>
              </>
            )}
            {(preview.uncovered.length > 0 || preview.elsewhere.length > 0) && (
              <>
                <dt>Kept</dt>
                <dd>
                  {preview.uncovered.map(({ library_address, mappings }) => (
                    <span key={library_address} className={styles.line}>{name_list(mappings.map(({ from_label }) => from_label))} in {library_name_at(library_address, label_libraries.known)} <span className={styles.count}>{uncovered_reason(mappings)}</span></span>
                  ))}
                  {preview.elsewhere.length > 0 && <span className={styles.line}>{name_list(preview.elsewhere)} <span className={styles.count}>in libraries you cannot write</span></span>}
                </dd>
              </>
            )}
            {preview.skipped.length > 0 && (
              <>
                <dt>Skipped</dt>
                <dd>{name_list(preview.skipped)} <span className={styles.count}>managed</span></dd>
              </>
            )}
            {scoped && (
              <>
                <dt>Scope</dt>
                <dd>every library <span className={styles.count}>the page's scope narrows only the view</span></dd>
              </>
            )}
          </dl>
        )}
        {preview.mappings.length > 0 && (is_delete || preview.merging) && <p className={styles.warning}>Cannot be undone</p>}
        {preview.refused.filter(({ reason }) => reason !== 'managed_source').map(({ mapping, reason }) => <p key={`${mapping.from_label}:${reason}`} className={styles.error}>!! {mapping.from_label}: {REFUSALS[reason]}.</p>)}
        {block !== null && <p className={styles.note} data-testid='relabel-block'>{block}</p>}
        <DialogActions>
          {/* A destructive change starts on Cancel. */}
          <button type='button' autoFocus={is_delete} onClick={on_close}>Cancel</button>
          <button type='submit' data-variant={is_delete || preview.merging ? 'danger' : 'primary'} disabled={block !== null} data-testid='relabel-confirm'>{confirm_label}</button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
