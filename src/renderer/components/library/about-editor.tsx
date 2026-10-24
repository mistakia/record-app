// Renames an own library (spec §2.6, §8.9.1): its About record carries the
// name and nothing else, which peers who link the library see. Who owns
// it is the identity's profile, edited on Identity. Text is shown and sent
// as plain text.

import { useEffect, useState, type FormEvent } from 'react'

import styles from './about-editor.module.css'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

export const AboutEditor = ({ address, note }: { address: string, note: string }) => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const about = node_api.endpoints.get_about.useQuery(address)
  const [name, set_name] = useState('')
  const [saving, set_saving] = useState(false)

  useEffect(() => {
    if (about.data !== undefined) set_name(about.data?.name ?? '')
  }, [about.data])

  // Null is a library that never wrote a name.
  const loaded = about.data !== undefined
  const trimmed = name.trim()

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (trimmed === '') return
    set_saving(true)
    await report_write({ dispatch, write: dispatch(node_api.endpoints.update_about.initiate({ address, name: trimmed })), success: 'Library renamed.' })
    set_saving(false)
  }

  return (
    <form className={styles.about} data-testid='about-editor' onSubmit={(event) => { save(event).catch(() => {}) }}>
      <p className={styles.note}>{note}</p>
      <label className={styles.field}>
        Name
        <input name='name' maxLength={128} value={name} onChange={(event) => { set_name(event.target.value) }} />
      </label>
      <div>
        <button type='submit' disabled={!writes_allowed || saving || !loaded || trimmed === '' || trimmed === (about.data?.name ?? '')}>Rename</button>
      </div>
    </form>
  )
}
