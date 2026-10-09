// The replication-policy editor (spec §8.6.5a, §8.9.1): per linked library,
// the node-local mode (full, selective, index_only), the selective filter
// through the shared FilterSpec editor, and a storage estimate scaled from
// a sample of the library's tracks. Connect and disconnect, and pins, are
// separate controls; the mode survives both.

import { useEffect, useState } from 'react'

import styles from './replication-policy.module.css'
import type { Library, ReplicationMode } from '#renderer/api/types.ts'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { FilterEditor } from '#renderer/components/filter/filter-editor.tsx'
import { library_name } from './library-category.ts'
import { estimate_storage, format_bytes } from '#renderer/filter/evaluate-filter.ts'
import { filter_problems, REPLICATION_FIELDS } from '#renderer/filter/filter-spec.ts'
import { node_api, track_page_args } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

export const MODE_LABELS: Record<ReplicationMode, string> = {
  full: 'Full',
  selective: 'Selective',
  index_only: 'Index only'
}

const MODE_TEXT: Record<ReplicationMode, string> = {
  full: 'Keep all of its audio on this device.',
  selective: 'Keep the audio of tracks matching a filter; fetch the rest when played.',
  index_only: 'Keep only the track list; fetch audio when played and let it go later.'
}

const is_known_mode = (mode: unknown): mode is ReplicationMode => typeof mode === 'string' && Object.hasOwn(MODE_LABELS, mode)

// A mode a newer node reports is shown by its own name, never hidden.
export const mode_label = (mode: string): string => is_known_mode(mode) ? MODE_LABELS[mode] : `(unknown mode: ${mode})`

export const ReplicationPolicyDialog = ({ library, on_close }: { library: Library, on_close: () => void }) => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const policy = node_api.endpoints.get_replication_policy.useQuery(library.address)
  const sample = node_api.endpoints.get_tracks.useQuery(track_page_args({ library_address: library.address, page: 0 }))
  const [mode, set_mode] = useState<ReplicationMode | null>(null)
  const [filter, set_filter] = useState<unknown>(null)
  const [initialised, set_initialised] = useState(false)
  const [saving, set_saving] = useState(false)

  // Start from the stored filter once the policy arrives, even when a mode
  // was picked before it did.
  useEffect(() => {
    if (policy.data === undefined || initialised) return
    set_initialised(true)
    set_filter(policy.data.filter)
  }, [policy.data, initialised])

  const stored_mode: string = policy.data?.mode ?? library.replication_mode ?? 'full'
  const current: string = mode ?? stored_mode
  const known = is_known_mode(current)
  const filter_ok = current !== 'selective' || (filter !== null && filter !== undefined && filter_problems(filter).length === 0)
  const stored_filter_fails = policy.data?.filter !== null && policy.data?.filter !== undefined && filter_problems(policy.data.filter).length > 0
  // The node's total counts only tracks whose content has arrived, so it is
  // complete only once the library is replicated.
  const replicated = !library.is_replicating && library.replication_status.progress >= library.replication_status.total
  const estimate = !known || !filter_ok
    ? null
    : estimate_storage({ mode: current, filter, sample: sample.data?.items, track_count: library.track_count, total_bytes: replicated ? library.audio_size_bytes : undefined, library_address: library.address })

  const save = async () => {
    if (!known) return
    set_saving(true)
    const saved = await report_write({
      dispatch,
      write: dispatch(node_api.endpoints.set_replication_policy.initiate({ address: library.address, mode: current as ReplicationMode, ...(current === 'selective' ? { filter } : {}) })),
      success: `Replication for ${library_name(library)} set to ${mode_label(current).toLowerCase()}.`
    })
    set_saving(false)
    if (saved.ok) on_close()
  }

  return (
    <Dialog open title='Replication policy' on_close={on_close}>
      <div className={styles.dialog} data-testid='replication-policy'>
        <h3>Replication for {library_name(library)}</h3>
        <p className={styles.muted}>This setting is for this device only; your other devices keep their own.</p>
        {policy.error !== undefined && <p className={styles.error}>{'message' in policy.error ? policy.error.message : 'The node request failed.'}</p>}
        <fieldset className={styles.modes}>
          <legend>Mode</legend>
          {(['full', 'selective', 'index_only'] as const).map((value) => (
            <label key={value}>
              <input type='radio' name='replication-mode' value={value} checked={current === value} onChange={() => { set_mode(value) }} />
              <strong>{MODE_LABELS[value]}</strong> {MODE_TEXT[value]}
            </label>
          ))}
        </fieldset>
        {current === 'selective' && (
          <FilterEditor
            label='Keep audio for tracks matching'
            value={filter}
            on_change={set_filter}
            fields={REPLICATION_FIELDS}
          />
        )}
        {!known && <p className={styles.error}>The node reports a mode this app does not know, {mode_label(current)}. Choose one above to change it.</p>}
        {stored_filter_fails && <p className={styles.error}>The stored filter has parts this app cannot read, so it may select nothing.</p>}
        {current === 'selective' && !filter_ok && <p className={styles.error}>Selective replication needs a complete filter.</p>}
        <p className={styles.estimate} data-testid='storage-estimate'>
          {!known
            ? 'No estimate for an unknown mode.'
            : !filter_ok
                ? 'Finish the filter to see an estimate.'
                : estimate === null
                  ? 'Estimating storage.'
                  : current === 'index_only'
                    ? 'Audio is kept only while recently played.'
                    : estimate.exact
                      ? `${format_bytes(estimate.bytes)} of audio kept on this device.`
                      : `About ${format_bytes(estimate.bytes)} of audio kept on this device` +
                      (estimate.sampled < library.track_count ? `, estimated from the ${estimate.sampled} most recently added of ${library.track_count} tracks` : '') +
                      (current === 'selective' ? ` (${estimate.matched} of ${estimate.sampled} sampled tracks match).` : '.')}
        </p>
        <div className={styles.actions}>
          <button type='button' onClick={on_close}>Cancel</button>
          <button type='button' data-variant='primary' disabled={!writes_allowed || saving || !known || !filter_ok || policy.data === undefined} onClick={() => { save().catch(() => {}) }}>
            {saving ? 'Saving' : 'Save'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
