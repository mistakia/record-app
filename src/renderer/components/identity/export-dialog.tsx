// Identity export (spec §8.5.3): a warning first, then the key shown once
// for copying. It lives only in this component's state, which is cleared
// on close; nothing logs, stores, or snapshots it.

import { useState } from 'react'

import styles from './identity.module.css'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { export_identity, record_export, type ExportedIdentity } from '#renderer/identity/identity.ts'

export const ExportDialog = ({ node_url, on_close }: { node_url: string, on_close: (exported: boolean) => void }) => {
  const [acknowledged, set_acknowledged] = useState(false)
  const [identity, set_identity] = useState<ExportedIdentity | null>(null)
  const [error, set_error] = useState<string | null>(null)
  const [copied, set_copied] = useState(false)

  const reveal = async () => {
    const result = await export_identity()
    if (!result.ok) {
      set_error(result.failure.message)
      return
    }
    record_export(node_url)
    set_identity(result.data)
  }

  const close = () => {
    const exported = identity !== null
    set_identity(null)
    on_close(exported)
  }

  return (
    <Dialog open title='Export identity' on_close={close}>
      <div className={styles.dialog} data-testid='export-dialog'>
        <p className={styles.warning}>
          This is your private key. Anyone with it controls your library and can write as you. Keep it somewhere only you can reach.
        </p>
        {identity === null
          ? (
            <>
              <label className={styles.check}>
                <input type='checkbox' checked={acknowledged} onChange={(event) => { set_acknowledged(event.target.checked) }} />
                I understand, and I am somewhere no one can see my screen.
              </label>
              {error !== null && <p className={styles.error}>{error}</p>}
              <div className={styles.actions}>
                <button type='button' onClick={close}>Cancel</button>
                <button type='button' disabled={!acknowledged} onClick={() => { reveal().catch((caught: unknown) => { set_error(String(caught)) }) }}>Show private key</button>
              </div>
            </>
            )
          : (
            <>
              <textarea className={styles.key} readOnly aria-label='Private key' value={identity.private_key} rows={4} data-testid='exported-key' />
              <div className={styles.actions}>
                <button
                  type='button'
                  onClick={() => { navigator.clipboard.writeText(identity.private_key).then(() => { set_copied(true) }).catch(() => { set_error('Copying failed; select the text instead.') }) }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button type='button' onClick={close}>Done</button>
              </div>
            </>
            )}
      </div>
    </Dialog>
  )
}
