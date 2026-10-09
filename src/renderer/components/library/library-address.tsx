// A library's address, short: the discriminator and the manifest CID's
// tail (`mixes · …8MnGCA`). The whole address is the tooltip, and a click
// copies it. Beside a name that is already the discriminator, only the
// tail shows.

import styles from './library-address.module.css'
import { parse_library_address, short_address } from './library-category.ts'
import { copy_text } from '#renderer/components/common/copy-text.ts'
import { use_app_dispatch } from '#renderer/store/index.ts'

export const LibraryAddress = ({ address, name }: { address: string, name?: string | undefined }) => {
  const dispatch = use_app_dispatch()
  const parts = parse_library_address(address)
  return (
    <button
      type='button'
      data-variant='glyph'
      className={styles.address}
      title={`${address}\nClick to copy`}
      aria-label={`Copy address ${address}`}
      data-testid='library-address'
      onClick={(event) => {
        event.stopPropagation()
        copy_text({ dispatch, text: address, label: 'the address' }).catch(() => {})
      }}
    >
      {parts !== null && parts.discriminator === name ? `…${parts.fingerprint}` : short_address(address)}
    </button>
  )
}
