// Tagging (spec §8.6.3, §8.6.9): tags are per library. A tag is added into a
// chosen writable library (an own one, or a shared one whose capability
// grants library.append_tag), defaulting to the library being viewed, else
// the holder of the track written to last, else any holder. A tag is
// removed only from an own active library: no capability authorises
// dropping a tag (§3.5.6). Tags from other libraries show read-only.

import { useState, type FormEvent } from 'react'

import styles from './tag-editor.module.css'
import type { Track } from '#renderer/api/types.ts'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { TargetSelect, use_write_target } from '#renderer/components/library/target-select.tsx'
import { target_fields } from '#renderer/library/write-targets.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

const MAX_TAG_LENGTH = 128

export const TagEditor = ({ track: initial, viewed_library, on_close }: {
  track: Track
  // The library the track list shows ('' for all), the default target.
  viewed_library: string
  on_close: () => void
}) => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const choice = use_write_target({ action: 'library.append_tag', preferred: viewed_library === '' ? null : viewed_library, holders: initial.library_addresses ?? [] })
  const [track, set_track] = useState(initial)
  const [draft, set_draft] = useState('')
  const [busy, set_busy] = useState(false)
  const tag = draft.trim()
  const editable = writes_allowed && !busy
  const removable = new Set((libraries.data ?? []).filter(({ is_own, is_retired, library_type }) => is_own && !is_retired && library_type === 'recordstore').map(({ address }) => address))

  const run = async (write: PromiseLike<{ data?: Track | undefined, error?: unknown }>, after?: () => void) => {
    set_busy(true)
    const updated = await report_write<Track>({ dispatch, write, success: null })
    if (updated !== null) {
      set_track(updated)
      after?.()
    }
    set_busy(false)
  }

  const add = (event: FormEvent) => {
    event.preventDefault()
    const { target } = choice
    if (!editable || target === null || tag === '' || tag.length > MAX_TAG_LENGTH) return
    run(dispatch(node_api.endpoints.add_tag.initiate({ track_id: track.id, tag, ...target_fields(target) })), () => {
      set_draft('')
      choice.used(target)
    }).catch(() => {})
  }

  const remove = (value: string, library_address: string) => {
    run(dispatch(node_api.endpoints.remove_tag.initiate({ track_id: track.id, tag: value, library_address }))).catch(() => {})
  }

  return (
    <Dialog open title={`Tags: ${track.title ?? 'Untitled'}`} on_close={on_close}>
      <div className={styles.editor} data-testid='tag-editor'>
        {!writes_allowed && <p className={styles.note}>Changes are paused until the app has caught up with the node.</p>}
        <ul className={styles.tags}>
          {track.tags.map(({ tag: value, library_address }) => (
            <li key={`${library_address}:${value}`} className={removable.has(library_address) ? undefined : styles.other} title={library_address}>
              <span>{value}</span>
              <span className={styles.from}>{choice.name_of(library_address)}</span>
              {removable.has(library_address) && (
                <button type='button' aria-label={`Remove tag ${value}`} disabled={!editable} onClick={() => { remove(value, library_address) }}>Remove</button>
              )}
            </li>
          ))}
          {track.tags.length === 0 && <li className={styles.other}>No tags yet.</li>}
        </ul>
        {choice.targets.length > 0
          ? (
            <form className={styles.add} onSubmit={add}>
              <input
                aria-label='New tag'
                value={draft}
                maxLength={MAX_TAG_LENGTH}
                placeholder='Add a tag'
                disabled={!editable}
                onChange={(event) => { set_draft(event.target.value) }}
              />
              <TargetSelect choice={choice} />
              <button type='submit' disabled={!editable || tag === '' || choice.target === null}>Add</button>
            </form>
            )
          : <p className={styles.note}>You have no library to tag into.</p>}
        <div className={styles.actions}>
          <button type='button' onClick={on_close}>Done</button>
        </div>
      </div>
    </Dialog>
  )
}
