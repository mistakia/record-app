// An own library's Profile and Sharing tabs (spec §8.6.1, §8.6.4, §4.8.3),
// beside its track list: the profile, with retirement at its foot, and the
// capabilities it has issued. The library is the route's ?library.

import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'

import styles from './library-manage.module.css'
import type { Library } from '#renderer/api/types.ts'
import { LibraryCapabilities } from '#renderer/components/capability/library-capabilities.tsx'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { DialogActions } from '#renderer/components/common/dialog-actions.tsx'
import { FramedSection } from '#renderer/components/common/framed-section.tsx'
import { AboutEditor } from '#renderer/components/library/about-editor.tsx'
import { can_retire, has_profile, library_name, own_libraries_of } from '#renderer/components/library/library-category.ts'
import { library_route } from '#renderer/routes.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

// The own library the route names, once the lists have loaded.
const use_managed_library = (): { library: Library | undefined, loading: boolean } => {
  const [search] = useSearchParams()
  const own = node_api.endpoints.get_own_libraries.useQuery()
  const all = node_api.endpoints.get_libraries.useQuery()
  const address = search.get('library') ?? ''
  const library = own_libraries_of({ own: own.data, libraries: all.data }).find((candidate) => candidate.address === address)
  return { library, loading: library === undefined && (own.isLoading || all.isLoading) }
}

const NotOwn = () => <p className={styles.muted}>This is not one of your libraries.</p>

export const LibraryProfile = () => {
  const dispatch = use_app_dispatch()
  const navigate = useNavigate()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const { library, loading } = use_managed_library()
  const [retiring, set_retiring] = useState(false)
  if (loading) return null
  if (library === undefined) return <section className={styles.page}><NotOwn /></section>
  const sharing = library_route({ tab: 'sharing', library_address: library.address })
  // A retired library has no profile to edit, so a stale link goes on to Sharing.
  if (!has_profile(library)) return <Navigate to={sharing} replace />

  const retire = async () => {
    set_retiring(false)
    const retired = await report_write({ dispatch, write: dispatch(node_api.endpoints.retire_own_library.initiate(library.address)), success: `Retired ${library_name(library)}.` })
    if (retired.ok) navigate(sharing, { replace: true })
  }

  return (
    <section className={styles.page} data-testid='library-profile-tab'>
      <FramedSection title='Profile'>
        <AboutEditor key={library.address} address={library.address} note='How this library introduces itself to the peers who link it.' />
      </FramedSection>
      {can_retire(library) && (
        <FramedSection title='Retire' fold_id='library-retire' default_open={false}>
          <div className={styles.retire}>
            <p className={styles.muted}>Retiring is permanent. The library stays readable and peers keep it, but nothing new can be written to it from any of your devices.</p>
            <div><button type='button' data-variant='danger' disabled={!writes_allowed} onClick={() => { set_retiring(true) }}>Retire library</button></div>
          </div>
        </FramedSection>
      )}
      <Dialog open={retiring} title='Retire library' on_close={() => { set_retiring(false) }}>
        <p>Retire {library_name(library)}? Retirement is permanent and cannot be undone.</p>
        <DialogActions>
          <button type='button' onClick={() => { set_retiring(false) }}>Cancel</button>
          <button type='button' data-variant='danger' onClick={() => { retire().catch(() => {}) }}>Retire permanently</button>
        </DialogActions>
      </Dialog>
    </section>
  )
}

export const LibrarySharing = () => {
  const { library, loading } = use_managed_library()
  if (loading) return null
  if (library === undefined) return <section className={styles.page}><NotOwn /></section>
  return (
    <section className={styles.page} data-testid='library-sharing-tab'>
      <FramedSection title='Who may write' width='full'>
        <LibraryCapabilities key={library.address} address={library.address} name={library_name(library)} retired={library.is_retired} />
      </FramedSection>
    </section>
  )
}
