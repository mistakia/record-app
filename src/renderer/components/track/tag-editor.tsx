// Tagging (spec §8.6.3): add and remove tags on a track in the own library.
// Chapter 7 writes tags only to the own library, so a track held only in
// linked libraries shows its tags read-only.

import { useState, type FormEvent } from 'react'

import styles from './tag-editor.module.css'
import type { Track } from '#renderer/api/types.ts'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

const MAX_TAG_LENGTH = 128

export const TagEditor = ({ track: initial, own_address, on_close }: { track: Track, own_address: string | null, on_close: () => void }) => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const [track, set_track] = useState(initial)
  const [draft, set_draft] = useState('')
  const [busy, set_busy] = useState(false)
  const own = track.have_track && own_address !== null
  const editable = own && writes_allowed && !busy
  const own_tags = track.tags.filter(({ library_address }) => library_address === own_address)
  const other_tags = track.tags.filter(({ library_address }) => library_address !== own_address)
  const tag = draft.trim()

  const write = async (kind: 'add' | 'remove', value: string) => {
    set_busy(true)
    const endpoint = kind === 'add' ? node_api.endpoints.add_tag : node_api.endpoints.remove_tag
    const updated = await report_write<Track>({ dispatch, write: dispatch(endpoint.initiate({ track_id: track.id, tag: value })), success: null })
    if (updated !== null) set_track(updated)
    if (updated !== null && kind === 'add') set_draft('')
    set_busy(false)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (editable && tag !== '' && tag.length <= MAX_TAG_LENGTH) write('add', tag).catch(() => {})
  }

  return (
    <Dialog open title={`Tags: ${track.title ?? 'Untitled'}`} on_close={on_close}>
      <div className={styles.editor} data-testid='tag-editor'>
        {!own && <p className={styles.note}>Tags can only be changed on tracks in your own library.</p>}
        {own && !writes_allowed && <p className={styles.note}>Changes are paused until the app has caught up with the node.</p>}
        <ul className={styles.tags}>
          {own_tags.map(({ tag: value }) => (
            <li key={value}>
              <span>{value}</span>
              {own && <button type='button' aria-label={`Remove tag ${value}`} disabled={!editable} onClick={() => { write('remove', value).catch(() => {}) }}>Remove</button>}
            </li>
          ))}
          {other_tags.map(({ tag: value, library_address }) => (
            <li key={`${library_address}:${value}`} className={styles.other} title={library_address}>
              <span>{value}</span>
              <span className={styles.from}>from another library</span>
            </li>
          ))}
          {track.tags.length === 0 && <li className={styles.other}>No tags yet.</li>}
        </ul>
        {own && (
          <form className={styles.add} onSubmit={submit}>
            <input
              aria-label='New tag'
              value={draft}
              maxLength={MAX_TAG_LENGTH}
              placeholder='Add a tag'
              disabled={!editable}
              onChange={(event) => { set_draft(event.target.value) }}
            />
            <button type='submit' disabled={!editable || tag === ''}>Add</button>
          </form>
        )}
        <div className={styles.actions}>
          <button type='button' onClick={on_close}>Done</button>
        </div>
      </div>
    </Dialog>
  )
}
