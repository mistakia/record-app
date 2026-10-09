// Libraries (spec §8.6.5, §8.6.5a): every library with its category,
// replication state and mode (with a one-action change), connect and
// disconnect, unlink, linking a new one, and the own libraries.

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'

import styles from './libraries.module.css'
import type { Library } from '#renderer/api/types.ts'
import { ContextMenu } from '#renderer/components/common/context-menu.tsx'
import { FramedSection } from '#renderer/components/common/framed-section.tsx'
import { use_library_actions } from '#renderer/components/library/library-actions.tsx'
import { OwnLibraries } from '#renderer/components/library/own-libraries.tsx'
import { mode_label } from '#renderer/components/library/replication-policy.tsx'
import { current_progress, is_replicating, library_category, library_name, RECENT_LINK_MS } from '#renderer/components/library/library-category.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { library_linked } from '#renderer/store/replication.ts'
import { tracks_route } from '#renderer/routes.ts'
import { report_write } from '#renderer/store/write.ts'
import { describe_scope } from '#renderer/library/capabilities.ts'
import { use_left_libraries } from '#renderer/library/left-libraries.ts'

const PREVIEW = 5

const LibraryRow = ({ library, libraries_fetched_at, now, show_address, actions }: {
  library: Library
  libraries_fetched_at: number | undefined
  now: number
  show_address: boolean
  actions: ReturnType<typeof use_library_actions>
}) => {
  const writes_allowed = use_app_selector(select_writes_allowed)
  const live_progress = use_app_selector((state) => state.replication.progress[library.address])
  const connected = use_app_selector((state) => state.replication.connected[library.address])
  const linked_at = use_app_selector((state) => state.replication.linked_at[library.address])
  const [menu, set_menu] = useState<{ x: number, y: number } | null>(null)
  const category = library_category(library)
  const held = node_api.endpoints.get_held_capabilities.useQuery(undefined, { skip: category !== 'shared' })
  const node_key = use_app_selector((state) => state.connection.config?.node_key ?? null)
  const left = use_left_libraries(node_key).includes(library.address)
  // Spec §8.6.1: a shared library shows the scope of what this identity holds there.
  const scope = category === 'shared'
    ? (held.data ?? []).filter(({ library_address, status }) => library_address === library.address && status === 'active').map(describe_scope)
    : []
  const progress = current_progress({ library, live_progress, libraries_fetched_at })
  const replicating = is_replicating({ library, progress, linked_at, now })

  return (
    <tr data-testid='library-row' data-category={category}>
      <td>
        <Link className={styles.name} to={tracks_route({ library_address: library.address })}>{library_name(library)}</Link>
        {show_address && <span className={styles.address}>{library.address}</span>}
        {scope.map((line) => <span key={line} className={styles.scope} data-testid='shared-scope'>You may: {line}</span>)}
        {left && <span className={styles.scope}>You left this shared library; the app offers no writes to it.</span>}
      </td>
      <td>
        <span className={styles.badge}>{category}</span>
        {library.library_type === 'listens' && <span className={styles.badge}>listens</span>}
        {library.is_retired && <span className={styles.badge}>retired</span>}
      </td>
      <td className='tabular'>{library.track_count}</td>
      <td data-testid='replication'>
        {category === 'own'
          ? 'Local'
          : replicating
            ? `Replicating${progress.total > 0 ? ` ${progress.progress} of ${progress.total}` : ''}`
            : connected === false ? 'Paused' : 'Up to date'}
      </td>
      <td data-testid='replication-mode'>
        {library.replication_mode === null || library.replication_mode === undefined
          ? 'None'
          : <span className={styles.mode}>{mode_label(library.replication_mode)}</span>}
        {category !== 'own' && library.is_linked && (
          <button type='button' data-size='small' data-variant='ghost' className={styles.change} disabled={!writes_allowed} onClick={() => { actions.edit_policy(library) }}>Change</button>
        )}
      </td>
      <td className='tabular'>{library.peer_ids.length}</td>
      <td className={styles.actions}>
        {category !== 'own' && (
          <>
            <button type='button' data-size='small' disabled={!writes_allowed || connected === true} onClick={() => { actions.set_connection(library, true) }}>Connect</button>
            <button type='button' data-size='small' disabled={!writes_allowed || connected === false} onClick={() => { actions.set_connection(library, false) }}>Disconnect</button>
          </>
        )}
        {library.is_linked && !library.is_own && <button type='button' data-size='small' disabled={!writes_allowed} onClick={() => { actions.request_unlink(library) }}>Unlink</button>}
        <button
          type='button'
          data-variant='glyph'
          aria-label={`Menu for ${library_name(library)}`}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            set_menu({ x: rect.left, y: rect.bottom })
          }}
        >
          …
        </button>
        {menu !== null && <ContextMenu x={menu.x} y={menu.y} items={actions.menu_items(library)} on_close={() => { set_menu(null) }} />}
      </td>
    </tr>
  )
}

export const Libraries = () => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const actions = use_library_actions()
  const [search] = useSearchParams()
  const link_input = useRef<HTMLInputElement>(null)
  const [address, set_address] = useState('')
  const [alias, set_alias] = useState('')
  const [show_all, set_show_all] = useState(false)
  const [show_addresses, set_show_addresses] = useState(false)
  // Re-evaluated every few seconds so a fresh link's grace period ends.
  const [now, set_now] = useState(Date.now())
  const has_recent_link = use_app_selector((state) => Object.values(state.replication.linked_at).some((at) => Date.now() - at < RECENT_LINK_MS))
  useEffect(() => {
    if (!has_recent_link) return
    const timer = setInterval(() => { set_now(Date.now()) }, 5_000)
    return () => { clearInterval(timer) }
  }, [has_recent_link])
  // The sidebar's [+] lands here with ?link=1.
  useEffect(() => { if (search.get('link') === '1') link_input.current?.focus() }, [search])

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

  const all = libraries.data ?? []
  const shown = show_all ? all : all.slice(0, PREVIEW)

  return (
    <section className={styles.page}>
      {libraries.error !== undefined && <p className={styles.error}>!! {'message' in libraries.error ? libraries.error.message : 'The node request failed.'}</p>}
      <FramedSection title='Libraries' count={all.length} width='full' testid='libraries-section'>
        <table className={styles.table}>
          <thead>
            <tr><th>Library</th><th>Category</th><th>Tracks</th><th>Replication</th><th>Mode</th><th>Peers</th><th /></tr>
          </thead>
          <tbody>
            {shown.map((library) => (
              <LibraryRow key={library.id} library={library} libraries_fetched_at={libraries.fulfilledTimeStamp} now={now} show_address={show_addresses} actions={actions} />
            ))}
          </tbody>
        </table>
        {all.length > shown.length && <button type='button' data-variant='ghost' data-size='small' className={styles.more} onClick={() => { set_show_all(true) }}>show {all.length - shown.length} more</button>}
        <button type='button' data-variant='ghost' data-size='small' className={styles.more} aria-pressed={show_addresses} onClick={() => { set_show_addresses(!show_addresses) }}>
          {show_addresses ? 'hide addresses' : 'show addresses'}
        </button>
      </FramedSection>
      <FramedSection title='Link a library' fold_id='libraries-link'>
        <form className={styles.link} onSubmit={(event) => { link(event).catch(() => {}) }}>
          <input ref={link_input} aria-label='Library address' placeholder='/record/<manifest-cid>/<name>' spellCheck={false} value={address} onChange={(event) => { set_address(event.target.value) }} />
          <input aria-label='Alias' placeholder='Alias (optional)' maxLength={128} value={alias} onChange={(event) => { set_alias(event.target.value) }} />
          <button type='submit' data-variant='primary' disabled={!writes_allowed || address.trim() === ''}>Link</button>
        </form>
      </FramedSection>
      <OwnLibraries />
      {actions.dialogs}
    </section>
  )
}
