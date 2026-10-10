// The own library's profile (`about`): name, bio, location, and an avatar,
// the CID of an image blob (protocol §2.6). The avatar is an image the user
// chooses, which main stores in the node (POST /images); the raw CID is
// behind advanced. Text is shown and sent as plain text. Saving a profile
// is what starts a node announcing (protocol §5.3.2), so the form says so.

import { useEffect, useState, type FormEvent } from 'react'

import styles from './about-editor.module.css'
import { is_cid } from './cid.ts'
import { Avatar } from '#renderer/components/common/avatar.tsx'
import { ShowStrip } from '#renderer/components/common/show-strip.tsx'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

interface AboutDraft { name: string, bio: string, location: string, avatar: string }

const FIELDS: Array<{ key: Exclude<keyof AboutDraft, 'avatar'>, label: string, max: number }> = [
  { key: 'name', label: 'Name', max: 128 },
  { key: 'location', label: 'Location', max: 128 },
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
  const [uploading, set_uploading] = useState(false)
  const [avatar_note, set_avatar_note] = useState<string | null>(null)

  useEffect(() => {
    if (about.data === undefined || about.data === null) return
    set_draft({ name: about.data.name ?? '', bio: about.data.bio ?? '', location: about.data.location ?? '', avatar: about.data.avatar ?? '' })
  }, [about.data])

  const avatar_valid = draft.avatar.trim() === '' || is_cid(draft.avatar.trim())
  // Null is a library that never set a profile: an empty one.
  const loaded = about.data !== undefined

  const choose_image = async () => {
    set_uploading(true)
    const result = await window.record.choose_image()
    set_uploading(false)
    if (!result.ok) {
      set_avatar_note(`!! ${result.failure.message}`)
      return
    }
    if (result.data === null) return
    set_draft({ ...draft, avatar: result.data.cid })
    set_avatar_note('Save the profile to use it.')
  }

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
    set_avatar_note(null)
  }

  return (
    <form className={styles.about} data-testid='about-editor' onSubmit={(event) => { save(event).catch(() => {}) }}>
      {note === undefined ? <h2>Your library's profile</h2> : <p className={styles.note}>{note}</p>}
      {FIELDS.map(({ key, label, max }) => (
        <label key={key} className={styles.field}>
          {label}
          {key === 'bio'
            ? <textarea name={key} maxLength={max} rows={3} value={draft[key]} onChange={(event) => { set_draft({ ...draft, [key]: event.target.value }) }} />
            : <input name={key} maxLength={max} placeholder={key === 'name' ? default_name : undefined} value={draft[key]} onChange={(event) => { set_draft({ ...draft, [key]: event.target.value }) }} />}
        </label>
      ))}
      <div className={styles.field} data-testid='avatar-field'>
        Avatar
        <div className={styles.avatar_row}>
          <Avatar address={address} size={48} cid={avatar_valid ? or_null(draft.avatar) : null} />
          <button type='button' data-size='small' disabled={!writes_allowed || uploading} onClick={() => { choose_image().catch(() => { set_uploading(false) }) }}>{uploading ? 'Uploading' : 'Choose image'}</button>
          {draft.avatar.trim() !== '' && <button type='button' data-size='small' data-variant='ghost' onClick={() => { set_draft({ ...draft, avatar: '' }); set_avatar_note('Save the profile to go back to the pattern.') }}>Remove</button>}
        </div>
        <span className={avatar_note?.startsWith('!!') === true ? styles.error : styles.hint}>{avatar_note ?? (draft.avatar.trim() === '' ? 'Until you choose one, the pattern from its address.' : ' ')}</span>
      </div>
      <ShowStrip label='advanced' testid='about-advanced'>
        <label className={styles.field}>
          Avatar CID
          <input name='avatar' maxLength={128} spellCheck={false} value={draft.avatar} onChange={(event) => { set_draft({ ...draft, avatar: event.target.value }) }} />
        </label>
      </ShowStrip>
      {!avatar_valid && <p className={styles.error}>The avatar must be the CID of an image already in the node.</p>}
      <p className={styles.note} data-testid='about-announce-warning'>Saving a profile starts announcing this library to every peer on the network, unless its node is set not to announce.</p>
      <div>
        <button type='submit' disabled={!writes_allowed || saving || !avatar_valid || !loaded}>Save profile</button>
      </div>
    </form>
  )
}
