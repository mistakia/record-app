// Libraries (spec §8.6.1, §8.6.5, §8.6.5a): every library, grouped by its
// category under a heading that names the relationship: yours, shared with
// you, following, discovered. Linked and shared rows carry replication
// state and mode (with a one-action change), connect and disconnect, and
// unlink; own rows open the library, whose tabs manage it. Linking and
// creating are their own step flows.

import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import styles from './libraries.module.css'
import type { Library } from '#renderer/api/types.ts'
import { ContextMenu } from '#renderer/components/common/context-menu.tsx'
import { FramedSection } from '#renderer/components/common/framed-section.tsx'
import { LibraryAddress } from '#renderer/components/library/library-address.tsx'
import { use_library_actions } from '#renderer/components/library/library-actions.tsx'
import { mode_label } from '#renderer/components/library/replication-policy.tsx'
import { current_progress, is_replicating, library_category, library_name, own_libraries_of, own_library_name, RECENT_LINK_MS, type LibraryCategory } from '#renderer/components/library/library-category.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_selector } from '#renderer/store/index.ts'
import { ROUTES, tracks_route } from '#renderer/routes.ts'
import { Avatar } from '#renderer/components/common/avatar.tsx'
import { describe_scope } from '#renderer/library/capabilities.ts'
import { use_left_libraries } from '#renderer/library/left-libraries.ts'

const PREVIEW = 5

const OTHER_GROUPS: Array<{ category: Exclude<LibraryCategory, 'own'>, title: string }> = [
  { category: 'shared', title: 'Shared with you' },
  { category: 'linked', title: 'Following' },
  { category: 'discovered', title: 'Discovered' }
]

const LibraryRow = ({ library, libraries_fetched_at, now, show_address, actions }: {
  library: Library
  libraries_fetched_at: number | undefined
  now: number
  show_address: boolean
  actions: ReturnType<typeof use_library_actions>
}) => {
  const writes_allowed = use_app_selector(select_writes_allowed)
  const live_progress = use_app_selector((state) => state.replication.progress[library.address])
  const connected = use_app_selector((state) => state.replication.connected[library.address]) ?? library.connected
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
        <Link className={styles.name} to={tracks_route({ library_address: library.address })}>
          <Avatar address={library.address} size={20} cid={library.avatar} />
          <span className={styles.label}>{library_name(library)}</span>
          {library.is_retired && <span className={styles.note}>retired</span>}
        </Link>
        {show_address && <span className={styles.address}><LibraryAddress address={library.address} name={library_name(library)} /></span>}
        {scope.map((line) => <span key={line} className={styles.scope} data-testid='shared-scope'>You may: {line}</span>)}
        {left && <span className={styles.scope}>You left this shared library; the app offers no writes to it.</span>}
      </td>
      <td className='tabular'>{library.track_count}</td>
      <td data-testid='replication'>
        {replicating
          ? `Replicating${progress.total > 0 ? ` ${progress.progress} of ${progress.total}` : ''}`
          : connected === false ? 'Paused' : 'Up to date'}
      </td>
      <td data-testid='replication-mode'>
        {library.replication_mode === null || library.replication_mode === undefined
          ? 'None'
          : <span className={styles.mode}>{mode_label(library.replication_mode)}</span>}
        {library.is_linked && (
          <button type='button' data-size='small' data-variant='ghost' className={styles.change} disabled={!writes_allowed} onClick={() => { actions.edit_policy(library) }}>Change</button>
        )}
      </td>
      <td className='tabular'>{library.peer_ids.length}</td>
      <td className={styles.actions}>
        <button type='button' data-size='small' disabled={!writes_allowed} onClick={() => { actions.set_connection(library, !connected) }}>{connected ? 'Pause' : 'Resume'}</button>
        {library.is_linked && <button type='button' data-size='small' disabled={!writes_allowed} onClick={() => { actions.request_unlink(library) }}>Unlink</button>}
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

// An own library: the listens library goes by Play history and opens
// Recently played; the others open their tracks, whose tabs manage them.
const OwnRow = ({ library, show_address }: { library: Library, show_address: boolean }) => {
  const listens = library.library_type === 'listens'
  const name = own_library_name(library)
  return (
    <tr data-testid='own-library-row' data-retired={library.is_retired} data-type={library.library_type}>
      <td>
        <Link className={styles.name} to={listens ? ROUTES.listens : tracks_route({ library_address: library.address })}>
          <Avatar address={library.address} size={20} cid={library.avatar} />
          <span className={styles.label}>{name}</span>
          {library.is_retired && <span className={styles.note}>retired</span>}
        </Link>
        {listens && <span className={styles.scope}>Where your plays are recorded.</span>}
        {show_address && <span className={styles.address}><LibraryAddress address={library.address} name={name} /></span>}
      </td>
      <td className='tabular'>{library.track_count}</td>
    </tr>
  )
}

// A group's rows, previewing a few with "show N more".
const Preview = <T,>({ items, render }: { items: readonly T[], render: (item: T) => ReactNode }) => {
  const [all, set_all] = useState(false)
  const shown = all ? items : items.slice(0, PREVIEW)
  return (
    <>
      {shown.map(render)}
      {items.length > shown.length && (
        <tr><td colSpan={6}><button type='button' data-variant='ghost' data-size='small' className={styles.more} onClick={() => { set_all(true) }}>show {items.length - shown.length} more</button></td></tr>
      )}
    </>
  )
}

export const Libraries = () => {
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const own_query = node_api.endpoints.get_own_libraries.useQuery()
  const actions = use_library_actions()
  const [show_addresses, set_show_addresses] = useState(false)
  // Re-evaluated every few seconds so a fresh link's grace period ends.
  const [now, set_now] = useState(Date.now())
  const has_recent_link = use_app_selector((state) => Object.values(state.replication.linked_at).some((at) => Date.now() - at < RECENT_LINK_MS))
  useEffect(() => {
    if (!has_recent_link) return
    const timer = setInterval(() => { set_now(Date.now()) }, 5_000)
    return () => { clearInterval(timer) }
  }, [has_recent_link])

  const own = own_libraries_of({ own: own_query.data, libraries: libraries.data })
  const others = (libraries.data ?? []).filter(({ is_own }) => !is_own)
  const error = libraries.error ?? own_query.error

  return (
    <section className={styles.page}>
      {error !== undefined && !('status' in error && error.status === 404) && <p className={styles.error}>!! {'message' in error ? error.message : 'The node request failed.'}</p>}
      <FramedSection title='Yours' count={own.length} width='full' testid='libraries-yours' controls={<Link to={ROUTES.new_library} aria-label='New library'>[new]</Link>}>
        <table className={styles.table}>
          <thead><tr><th>Library</th><th>Tracks</th></tr></thead>
          <tbody>
            <Preview items={own} render={(library) => <OwnRow key={library.id} library={library} show_address={show_addresses} />} />
          </tbody>
        </table>
      </FramedSection>
      {OTHER_GROUPS.map(({ category, title }) => {
        const members = others.filter((library) => library_category(library) === category)
        if (members.length === 0 && category !== 'linked') return null
        return (
          <FramedSection
            key={category}
            title={title}
            count={members.length}
            width='full'
            testid={`libraries-${category}`}
            controls={category === 'linked' ? <Link to={ROUTES.link_library} aria-label='Link a library'>[link]</Link> : undefined}
          >
            {members.length === 0
              ? <p className={styles.empty}>Follow a library by its address, and its tracks replicate here. <Link to={ROUTES.link_library}>Link a library</Link></p>
              : (
                <table className={styles.table}>
                  <thead>
                    <tr><th>Library</th><th>Tracks</th><th>Replication</th><th>Mode</th><th>Peers</th><th /></tr>
                  </thead>
                  <tbody>
                    <Preview
                      items={members}
                      render={(library) => <LibraryRow key={library.id} library={library} libraries_fetched_at={libraries.fulfilledTimeStamp} now={now} show_address={show_addresses} actions={actions} />}
                    />
                  </tbody>
                </table>
                )}
          </FramedSection>
        )
      })}
      <button type='button' data-variant='ghost' data-size='small' className={styles.more} aria-pressed={show_addresses} onClick={() => { set_show_addresses(!show_addresses) }}>
        {show_addresses ? 'hide addresses' : 'show addresses'}
      </button>
      {actions.dialogs}
    </section>
  )
}
