// A library's profile in the page head (legacy-v0's library header): avatar,
// name, its short address (copies the whole one), OWNER on an own library,
// an own recordstore's TRACKS │ PROFILE │ SHARING tabline, and its counts,
// which pulse while the node indexes it.

import { Link } from 'react-router'

import styles from './page-head.module.css'
import type { Library } from '#renderer/api/types.ts'
import { Avatar } from '#renderer/components/common/avatar.tsx'
import { LibraryAddress } from '#renderer/components/library/library-address.tsx'
import { current_progress, has_profile, is_replicating, library_name } from '#renderer/components/library/library-category.ts'
import { library_route, type LibraryTab } from '#renderer/routes.ts'
import { use_app_selector } from '#renderer/store/index.ts'

const TABS: Array<{ tab: LibraryTab, label: string }> = [
  { tab: 'tracks', label: 'Tracks' },
  { tab: 'profile', label: 'Profile' },
  { tab: 'sharing', label: 'Sharing' }
]

export const LibraryProfileHeader = ({ library, tab }: { library: Library, tab: LibraryTab }) => {
  const live_progress = use_app_selector((state) => state.replication.progress[library.address])
  const linked_at = use_app_selector((state) => state.replication.linked_at[library.address])
  const progress = current_progress({ library, live_progress, libraries_fetched_at: undefined })
  const replicating = is_replicating({ library, progress, linked_at, now: Date.now() })
  const indexing = library.is_processing_index || library.is_loading_index
  const name = library_name(library)
  return (
    <div className={styles.profile} data-testid='library-profile'>
      <div className={styles.identity}>
        <Avatar address={library.address} size={24} cid={library.avatar} />
        <span className={styles.name}>{name}</span>
        <LibraryAddress address={library.address} name={name} />
        {library.is_own && <span className={styles.chip}>Owner</span>}
      </div>
      {library.is_own && library.library_type === 'recordstore' && (
        <div className={styles.tabs} role='tablist'>
          {TABS.filter(({ tab: shown }) => shown !== 'profile' || has_profile(library)).map(({ tab: shown, label }) => (
            <Link key={shown} role='tab' aria-selected={tab === shown} to={library_route({ tab: shown, library_address: library.address })}>{label}</Link>
          ))}
        </div>
      )}
      <div className={styles.meta}>
        {replicating && progress.total > 0 && (
          <span className={styles.replication} role='progressbar' aria-label='Replicating' aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.progress}>
            <span style={{ transform: `scaleX(${Math.min(1, progress.progress / progress.total)})` }} />
          </span>
        )}
        <span className={indexing ? `${styles.counts} ${styles.pulse}` : styles.counts} data-testid='library-counts'>
          {library.track_count} tracks · {library.linked_library_count} libraries
        </span>
      </div>
    </div>
  )
}
