// Identity export (spec §8.5.3): a warning here, a confirmation in main's
// native dialog, then the key shown once for copying. It lives only in this
// component's state, which is cleared on close; nothing logs, stores, or
// snapshots it.

import { useState } from 'react'

import styles from './identity.module.css'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { export_identity, record_export, type ExportedIdentity } from '#renderer/identity/identity.ts'

export const ExportDialog = ({ node_key, on_close }: { node_key: string, on_close: (exported: boolean) => void }) => {
  const [identity, set_identity] = useState<ExportedIdentity | null>(null)
  const [error, set_error] = useState<string | null>(null)
  const [copied, set_copied] = useState(false)

  const reveal = async () => {
    const result = await export_identity()
    if (!result.ok) {
      if (result.failure.kind !== 'aborted') set_error(result.failure.message)
      return
    }
    record_export(node_key)
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
              <p className={styles.muted}>Make sure no one can see your screen. The app asks you to confirm once more before it shows the key.</p>
              {error !== null && <p className={styles.error}>{error}</p>}
              <div className={styles.actions}>
                <button type='button' onClick={close}>Cancel</button>
                <button type='button' onClick={() => { reveal().catch((caught: unknown) => { set_error(String(caught)) }) }}>Show private key</button>
              </div>
            </>
            )
          : (
            <>
              {copied && <p className={styles.muted} data-testid='clipboard-note'>Copied. The clipboard is cleared in 60 seconds if it still holds the key.</p>}
              <textarea className={styles.key} readOnly aria-label='Private key' value={identity.private_key} rows={4} data-testid='exported-key' />
              <div className={styles.actions}>
                <button
                  type='button'
                  onClick={() => {
                    window.record.identity.copy_key({ text: identity.private_key })
                      .then((result) => { if (result.ok) set_copied(true); else set_error(result.failure.message) })
                      .catch(() => { set_error('Copying failed; select the text instead.') })
                  }}
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
