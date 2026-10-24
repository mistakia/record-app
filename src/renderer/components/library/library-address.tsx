// A library's address, short: the manifest CID's tail (`…8MnGCA`), never
// the discriminator, which is not a name (spec §8.6.9). The whole address
// is the tooltip, and a click copies it: on hover a small `copy` tip sits
// under the box, `copied` for a moment after a click.

import { useEffect, useState } from 'react'

import styles from './library-address.module.css'
import { address_tail } from './library-category.ts'
import { copy_text } from '#renderer/components/common/copy-text.ts'
import { use_app_dispatch } from '#renderer/store/index.ts'

const COPIED_MS = 1200

export const LibraryAddress = ({ address }: { address: string }) => {
  const dispatch = use_app_dispatch()
  const [copied, set_copied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => { set_copied(false) }, COPIED_MS)
    return () => { clearTimeout(timer) }
  }, [copied])
  return (
    <button
      type='button'
      data-variant='glyph'
      className={styles.address}
      title={address}
      aria-label={`Copy address ${address}`}
      data-testid='library-address'
      data-copied={copied}
      onClick={(event) => {
        event.stopPropagation()
        set_copied(true)
        copy_text({ dispatch, text: address, label: 'the address' }).catch(() => {})
      }}
    >
      {address_tail(address)}
    </button>
  )
}
