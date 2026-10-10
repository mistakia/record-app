// A library's address, short: the discriminator and the manifest CID's
// tail (`mixes · …8MnGCA`). The whole address is the tooltip, and a click
// copies it: on hover a `copy` hint sits after the box, `copied` for a
// moment after a click. Beside a name that is already the discriminator,
// only the tail shows.

import { useEffect, useState } from 'react'

import styles from './library-address.module.css'
import { parse_library_address, short_address } from './library-category.ts'
import { copy_text } from '#renderer/components/common/copy-text.ts'
import { use_app_dispatch } from '#renderer/store/index.ts'

const COPIED_MS = 1200

export const LibraryAddress = ({ address, name }: { address: string, name?: string | undefined }) => {
  const dispatch = use_app_dispatch()
  const parts = parse_library_address(address)
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
      {parts !== null && parts.discriminator === name ? `…${parts.fingerprint}` : short_address(address)}
    </button>
  )
}
