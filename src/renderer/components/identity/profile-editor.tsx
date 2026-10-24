// The identity's profile (spec §4.8.2, §8.5.7): who the person is, a name,
// a bio, and an avatar, the CID of an image blob, as distinct from any
// library's name. The avatar is an image the user chooses, which main
// stores in the node (POST /images); the raw CID is behind advanced. A
// save replaces the whole profile, so a field left empty is cleared
// (identity/profile.ts). Text is shown and sent as plain text.

import { useEffect, useState, type FormEvent } from 'react'

import styles from '#renderer/components/library/about-editor.module.css'
import { is_cid } from '#renderer/components/library/cid.ts'
import { Avatar } from '#renderer/components/common/avatar.tsx'
import { ShowStrip } from '#renderer/components/common/show-strip.tsx'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'
import { profile_body, type ProfileDraft } from '#renderer/identity/profile.ts'

// `default_name` is what an empty name shows as: the handle from the key.
export const ProfileEditor = ({ public_key, default_name }: { public_key: string, default_name: string | undefined }) => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const profile = node_api.endpoints.get_profile.useQuery()
  const [draft, set_draft] = useState<ProfileDraft>({ name: '', bio: '', avatar: '' })
  const [saving, set_saving] = useState(false)
  const [uploading, set_uploading] = useState(false)
  const [avatar_note, set_avatar_note] = useState<string | null>(null)

  useEffect(() => {
    if (profile.data === undefined) return
    set_draft({ name: profile.data.name ?? '', bio: profile.data.bio ?? '', avatar: profile.data.avatar ?? '' })
  }, [profile.data])

  const avatar_valid = draft.avatar.trim() === '' || is_cid(draft.avatar.trim())
  const shown_avatar = avatar_valid && draft.avatar.trim() !== '' ? draft.avatar.trim() : null

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
    await report_write({ dispatch, write: dispatch(node_api.endpoints.update_profile.initiate(profile_body(draft))), success: 'Profile saved.' })
    set_saving(false)
    set_avatar_note(null)
  }

  return (
    <form className={styles.about} data-testid='profile-editor' onSubmit={(event) => { save(event).catch(() => {}) }}>
      <p className={styles.note}>
        Who you are to the peers who see your libraries. Naming a library never renames you.
        {default_name === undefined ? '' : ` Until you name yourself, you go by ${default_name}, from your key.`}
      </p>
      <label className={styles.field}>
        Name
        <input name='name' maxLength={128} placeholder={default_name} value={draft.name} onChange={(event) => { set_draft({ ...draft, name: event.target.value }) }} />
      </label>
      <label className={styles.field}>
        Bio
        <textarea name='bio' maxLength={1024} rows={3} value={draft.bio} onChange={(event) => { set_draft({ ...draft, bio: event.target.value }) }} />
      </label>
      <div className={styles.field} data-testid='avatar-field'>
        Avatar
        <div className={styles.avatar_row}>
          <Avatar seed={public_key} size={48} cid={shown_avatar} />
          <button type='button' data-size='small' disabled={!writes_allowed || uploading} onClick={() => { choose_image().catch(() => { set_uploading(false) }) }}>{uploading ? 'Uploading' : 'Choose image'}</button>
          {draft.avatar.trim() !== '' && <button type='button' data-size='small' data-variant='ghost' onClick={() => { set_draft({ ...draft, avatar: '' }); set_avatar_note('Save the profile to go back to the pattern.') }}>Remove</button>}
        </div>
        <span className={avatar_note?.startsWith('!!') === true ? styles.error : styles.hint}>{avatar_note ?? (draft.avatar.trim() === '' ? 'Until you choose one, the pattern from your key.' : ' ')}</span>
      </div>
      <ShowStrip label='advanced' testid='profile-advanced'>
        <label className={styles.field}>
          Avatar CID
          <input name='avatar' maxLength={128} spellCheck={false} value={draft.avatar} onChange={(event) => { set_draft({ ...draft, avatar: event.target.value }) }} />
        </label>
      </ShowStrip>
      {!avatar_valid && <p className={styles.error}>The avatar must be the CID of an image already in the node.</p>}
      <div>
        <button type='submit' disabled={!writes_allowed || saving || !avatar_valid || profile.data === undefined}>Save profile</button>
      </div>
    </form>
  )
}
