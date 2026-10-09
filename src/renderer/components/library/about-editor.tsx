// The own library's profile (`about`): name, bio, location, and an avatar
// given as the CID of an image blob (protocol §2.6). Text is shown and sent
// as plain text.

import { useEffect, useState, type FormEvent } from 'react'

import styles from './about-editor.module.css'
import { is_cid } from './cid.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

interface AboutDraft { name: string, bio: string, location: string, avatar: string }

const FIELDS: Array<{ key: keyof AboutDraft, label: string, max: number }> = [
  { key: 'name', label: 'Name', max: 128 },
  { key: 'location', label: 'Location', max: 128 },
  { key: 'avatar', label: 'Avatar CID', max: 128 },
  { key: 'bio', label: 'Bio', max: 1024 }
]

const or_null = (value: string): string | null => value.trim() === '' ? null : value.trim()

// `note` replaces the heading with a line of explanation, where the
// surrounding section already names the profile; `default_name` is what an
// empty name shows as.
export const AboutEditor = ({ address, note, default_name }: { address: string, note?: string, default_name?: string | undefined }) => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const about = node_api.endpoints.get_about.useQuery(address)
  const [draft, set_draft] = useState<AboutDraft>({ name: '', bio: '', location: '', avatar: '' })
  const [saving, set_saving] = useState(false)

  useEffect(() => {
    if (about.data === undefined) return
    set_draft({ name: about.data.name ?? '', bio: about.data.bio ?? '', location: about.data.location ?? '', avatar: about.data.avatar ?? '' })
  }, [about.data])

  const avatar_valid = draft.avatar.trim() === '' || is_cid(draft.avatar.trim())
  // A library that never set a profile answers 404: an empty profile.
  const no_profile_yet = about.error !== undefined && 'status' in about.error && about.error.status === 404
  const loaded = about.data !== undefined || no_profile_yet

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!avatar_valid) return
    set_saving(true)
    await report_write({
      dispatch,
      write: dispatch(node_api.endpoints.update_about.initiate({
        address,
        about: { name: or_null(draft.name), bio: or_null(draft.bio), location: or_null(draft.location), avatar: or_null(draft.avatar) }
      })),
      success: 'Profile saved.'
    })
    set_saving(false)
  }

  return (
    <form className={styles.about} data-testid='about-editor' onSubmit={(event) => { save(event).catch(() => {}) }}>
      {note === undefined ? <h2>Your library's profile</h2> : <p className={styles.note}>{note}</p>}
      {FIELDS.map(({ key, label, max }) => (
        <label key={key} className={styles.field}>
          {label}
          {key === 'bio'
            ? <textarea name={key} maxLength={max} rows={3} value={draft[key]} onChange={(event) => { set_draft({ ...draft, [key]: event.target.value }) }} />
            : <input name={key} maxLength={max} spellCheck={key !== 'avatar'} placeholder={key === 'name' ? default_name : undefined} value={draft[key]} onChange={(event) => { set_draft({ ...draft, [key]: event.target.value }) }} />}
        </label>
      ))}
      {!avatar_valid && <p className={styles.error}>The avatar must be the CID of an image already in the node.</p>}
      <div>
        <button type='submit' disabled={!writes_allowed || saving || !avatar_valid || !loaded}>Save profile</button>
      </div>
    </form>
  )
}
