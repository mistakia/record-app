// Libraries (spec §8.6.5): every library with its category, replication
// state, connect and disconnect, unlink, linking a new one, and the own
// library's profile.

import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import styles from './libraries.module.css'
import type { Library } from '#renderer/api/types.ts'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { AboutEditor } from '#renderer/components/library/about-editor.tsx'
import { current_progress, is_replicating, library_category, library_name, RECENT_LINK_MS } from '#renderer/components/library/library-category.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { library_connection_requested, library_linked } from '#renderer/store/replication.ts'
import { library_selected } from '#renderer/store/ui.ts'
import { report_write } from '#renderer/store/write.ts'

const LibraryRow = ({ library, libraries_fetched_at, now, on_unlink }: {
  library: Library
  libraries_fetched_at: number | undefined
  now: number
  on_unlink: (library: Library) => void
}) => {
  const dispatch = use_app_dispatch()
  const navigate = useNavigate()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const live_progress = use_app_selector((state) => state.replication.progress[library.address])
  const connected = use_app_selector((state) => state.replication.connected[library.address])
  const linked_at = use_app_selector((state) => state.replication.linked_at[library.address])
  const category = library_category(library)
  const progress = current_progress({ library, live_progress, libraries_fetched_at })
  const replicating = is_replicating({ library, progress, linked_at, now })

  const set_connection = (connect: boolean) => {
    const endpoint = connect ? node_api.endpoints.connect_library : node_api.endpoints.disconnect_library
    report_write({ dispatch, write: dispatch(endpoint.initiate(library.address)), success: connect ? 'Replication resumed.' : 'Replication paused.' })
      .then((result) => { if (result !== null) dispatch(library_connection_requested({ address: library.address, connected: connect })) })
      .catch(() => {})
  }

  return (
    <tr data-testid='library-row' data-category={category}>
      <td>
        <span className={styles.name}>{library_name(library)}</span>
        <span className={styles.address}>{library.address}</span>
      </td>
      <td><span className={`${styles.badge} ${styles[category]}`}>{category}</span></td>
      <td>{library.track_count}</td>
      <td data-testid='replication'>
        {category === 'own'
          ? 'Local'
          : replicating
            ? `Replicating${progress.total > 0 ? ` ${progress.progress} of ${progress.total}` : ''}`
            : connected === false ? 'Paused' : 'Up to date'}
      </td>
      <td>{library.peer_ids.length}</td>
      <td className={styles.actions}>
        <button type='button' onClick={() => { dispatch(library_selected(library.address)); navigate('/tracks') }}>Tracks</button>
        {category !== 'own' && (
          <>
            <button type='button' disabled={!writes_allowed || connected === true} onClick={() => { set_connection(true) }}>Connect</button>
            <button type='button' disabled={!writes_allowed || connected === false} onClick={() => { set_connection(false) }}>Disconnect</button>
          </>
        )}
        {category === 'linked' && <button type='button' disabled={!writes_allowed} onClick={() => { on_unlink(library) }}>Unlink</button>}
      </td>
    </tr>
  )
}

export const Libraries = () => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const [address, set_address] = useState('')
  const [alias, set_alias] = useState('')
  const [unlinking, set_unlinking] = useState<Library | null>(null)
  const own = libraries.data?.find(({ is_own }) => is_own)
  // Re-evaluated every few seconds so a fresh link's grace period ends.
  const [now, set_now] = useState(Date.now())
  const has_recent_link = use_app_selector((state) => Object.values(state.replication.linked_at).some((at) => Date.now() - at < RECENT_LINK_MS))
  useEffect(() => {
    if (!has_recent_link) return
    const timer = setInterval(() => { set_now(Date.now()) }, 5_000)
    return () => { clearInterval(timer) }
  }, [has_recent_link])

  const link = async (event: FormEvent) => {
    event.preventDefault()
    const library_address = address.trim()
    if (library_address === '') return
    const linked = await report_write<Library>({
      dispatch,
      write: dispatch(node_api.endpoints.link_library.initiate({ library_address, alias: alias.trim() === '' ? null : alias.trim() })),
      success: 'Linked. Its tracks arrive as it replicates.'
    })
    if (linked === null) return
    dispatch(library_linked(linked.address))
    set_address('')
    set_alias('')
  }

  const unlink = async () => {
    if (unlinking === null) return
    const target = unlinking
    set_unlinking(null)
    await report_write({ dispatch, write: dispatch(node_api.endpoints.unlink_library.initiate(target.address)), success: `Unlinked ${library_name(target)}.` })
  }

  return (
    <section className={styles.page}>
      <h1>Libraries</h1>
      {libraries.error !== undefined && <p className={styles.error}>{'message' in libraries.error ? libraries.error.message : 'The node request failed.'}</p>}
      <table className={styles.table}>
        <thead>
          <tr><th>Library</th><th>Category</th><th>Tracks</th><th>Replication</th><th>Peers</th><th /></tr>
        </thead>
        <tbody>
          {libraries.data?.map((library) => (
            <LibraryRow key={library.id} library={library} libraries_fetched_at={libraries.fulfilledTimeStamp} now={now} on_unlink={set_unlinking} />
          ))}
        </tbody>
      </table>
      <form className={styles.link} onSubmit={(event) => { link(event).catch(() => {}) }}>
        <h2>Link a library</h2>
        <input aria-label='Library address' placeholder='/record/<manifest-cid>/<name>' spellCheck={false} value={address} onChange={(event) => { set_address(event.target.value) }} />
        <input aria-label='Alias' placeholder='Alias (optional)' maxLength={128} value={alias} onChange={(event) => { set_alias(event.target.value) }} />
        <button type='submit' disabled={!writes_allowed || address.trim() === ''}>Link</button>
      </form>
      {own !== undefined && <AboutEditor address={own.address} />}
      <Dialog open={unlinking !== null} title='Unlink library' on_close={() => { set_unlinking(null) }}>
        <p>
          Unlink {unlinking === null ? '' : library_name(unlinking)}? It leaves every view, and the node drops its replica and any
          content only it held.
        </p>
        <div className={styles.dialog_actions}>
          <button type='button' onClick={() => { set_unlinking(null) }}>Cancel</button>
          <button type='button' onClick={() => { unlink().catch(() => {}) }}>Unlink</button>
        </div>
      </Dialog>
    </section>
  )
}
