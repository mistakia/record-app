// Identity import (spec §8.5.4): bundled mode only, behind a typed
// confirmation. In remote mode the app does not import keys into a node it
// does not control, and says so.

import { useState, type FormEvent } from 'react'

import styles from './identity.module.css'
import { IMPORT_CONFIRMATION_PHRASE, import_identity } from '#renderer/identity/identity.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { notified } from '#renderer/store/notifications.ts'
import type { ConnectionMode } from '#shared/bridge.ts'

export const ImportForm = ({ mode }: { mode: ConnectionMode }) => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const [private_key, set_private_key] = useState('')
  const [confirmation, set_confirmation] = useState('')
  const [busy, set_busy] = useState(false)

  if (mode !== 'bundled') {
    return (
      <p className={styles.muted} data-testid='import-unavailable'>
        Importing an identity replaces the node's own, so it is only offered for the bundled node on this device. For a remote node,
        its operator imports the key on that node directly.
      </p>
    )
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    set_busy(true)
    const result = await import_identity({ private_key, confirmation })
    set_busy(false)
    if (!result.ok) {
      dispatch(notified({ kind: 'error', message: result.failure.message }))
      return
    }
    set_private_key('')
    set_confirmation('')
    dispatch(node_api.util.resetApiState())
    dispatch(notified({ kind: 'info', message: 'Identity imported. Libraries now reflect the imported identity.' }))
  }

  return (
    <form className={styles.import} onSubmit={(event) => { submit(event).catch(() => { set_busy(false) }) }}>
      <p className={styles.warning}>Importing replaces this node's identity. Libraries written under the current key stay on disk but can no longer be written until that key is imported again.</p>
      <textarea aria-label='Private key to import' rows={3} value={private_key} spellCheck={false} onChange={(event) => { set_private_key(event.target.value) }} />
      <label>
        Type "{IMPORT_CONFIRMATION_PHRASE}" to confirm
        <input value={confirmation} onChange={(event) => { set_confirmation(event.target.value) }} />
      </label>
      <button type='submit' disabled={!writes_allowed || busy || private_key.trim() === '' || confirmation.trim().toLowerCase() !== IMPORT_CONFIRMATION_PHRASE}>
        Import identity
      </button>
    </form>
  )
}
