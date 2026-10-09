// The library sidebar (STYLE.md § Layout › Sidebar), legacy-v0's shell:
// back and forward, RECORD, MY LIBRARY, the linked and shared LIBRARIES with
// their menus, and a footer with the identity's profile, Settings, and the
// connection.

import { useState } from 'react'
import { Link, useLocation } from 'react-router'

import styles from './sidebar.module.css'
import { HistoryNav } from './history-nav.tsx'
import { SettingsIcon } from './settings-icon.tsx'
import type { Library } from '#renderer/api/types.ts'
import { Avatar } from '#renderer/components/common/avatar.tsx'
import { key_handle, key_pattern } from '#renderer/identity/default-name.ts'
import { ContextMenu } from '#renderer/components/common/context-menu.tsx'
import { ConnectionStatus } from '#renderer/components/layout/connection-banner.tsx'
import { use_library_actions } from '#renderer/components/library/library-actions.tsx'
import { current_progress, has_profile, is_replicating, library_name, own_libraries_of } from '#renderer/components/library/library-category.ts'
import { parse_track_view, ROUTES, settings_route, tracks_route } from '#renderer/routes.ts'
import { node_api } from '#renderer/store/api.ts'
import { use_app_selector } from '#renderer/store/index.ts'

// Whether a sidebar link is the current page: a track list matches on its
// library too, since every library's tracks share one path.
const use_is_current = (): ((to: string) => boolean) => {
  const { pathname, search } = useLocation()
  const viewed = pathname === ROUTES.tracks ? parse_track_view(new URLSearchParams(search)).library_address : null
  return (to) => {
    const [path, query = ''] = to.split('?')
    if (path !== pathname) return false
    return path !== ROUTES.tracks || parse_track_view(new URLSearchParams(query)).library_address === viewed
  }
}

const NavItem = ({ to, children, current }: { to: string, children: React.ReactNode, current: boolean }) => (
  <Link to={to} className={styles.item} aria-current={current ? 'page' : undefined}>{children}</Link>
)

const ReplicationGauge = ({ library, fetched_at }: { library: Library, fetched_at: number | undefined }) => {
  const live_progress = use_app_selector((state) => state.replication.progress[library.address])
  const linked_at = use_app_selector((state) => state.replication.linked_at[library.address])
  const progress = current_progress({ library, live_progress, libraries_fetched_at: fetched_at })
  if (!is_replicating({ library, progress, linked_at, now: Date.now() })) return null
  const share = progress.total > 0 ? Math.min(1, progress.progress / progress.total) : 0
  return (
    <span className={styles.gauge} role='progressbar' aria-label='Replicating' aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.progress}>
      <span style={{ transform: `scaleX(${share})` }} />
    </span>
  )
}

export const Sidebar = () => {
  const is_current = use_is_current()
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const own = node_api.endpoints.get_own_libraries.useQuery()
  const actions = use_library_actions()
  const [menu, set_menu] = useState<{ x: number, y: number, library: Library } | null>(null)
  const own_active = own_libraries_of({ own: own.data, libraries: libraries.data }).filter(has_profile)
  const others = (libraries.data ?? []).filter((library) => !library.is_own && (library.is_linked || library.held_capability_ids.length > 0))
  // The identity has no profile of its own (spec §8.6.9): it goes by its
  // default own library's About name and avatar.
  const identity = own_active[0]
  const public_key = node_api.endpoints.get_public_key.useQuery().data
  // Unnamed, it goes by the handle and pattern its key gives it.
  const identity_name = identity?.name ?? (public_key === undefined ? null : key_handle(public_key))

  return (
    <nav className={styles.sidebar} aria-label='Library'>
      <div className={styles.top}><HistoryNav /></div>
      <div className={styles.section}>
        <h2 className={styles.heading}>Record</h2>
        <NavItem to={ROUTES.tracks} current={is_current(ROUTES.tracks)}>Tracks</NavItem>
        <NavItem to={ROUTES.listens} current={is_current(ROUTES.listens)}>Recently played</NavItem>
      </div>
      <div className={styles.section}>
        <h2 className={styles.heading}>My library</h2>
        {own_active.length <= 1
          ? <NavItem to={tracks_route({ library_address: own_active[0]?.address ?? '' })} current={own_active[0] !== undefined && is_current(tracks_route({ library_address: own_active[0].address }))}>Tracks</NavItem>
          : own_active.map((library) => {
            const to = tracks_route({ library_address: library.address })
            return <NavItem key={library.id} to={to} current={is_current(to)}>{library_name(library)}</NavItem>
          })}
        <NavItem to={ROUTES.libraries} current={is_current(ROUTES.libraries)}>Libraries</NavItem>
      </div>
      <div className={styles.libraries}>
        <h2 className={`${styles.heading} ${styles.sticky}`}>
          Libraries
          <Link to={`${ROUTES.libraries}?link=1`} className={styles.add} aria-label='Link a library'>[+]</Link>
        </h2>
        {others.map((library) => {
          const to = tracks_route({ library_address: library.address })
          return (
            <div key={library.id} className={styles.library} aria-current={is_current(to) ? 'page' : undefined} data-testid='sidebar-library'>
              <Link to={to} className={styles.library_link}>
                <Avatar name={library_name(library)} size={24} cid={library.avatar} />
                <span className={styles.name}>{library_name(library)}</span>
                <ReplicationGauge library={library} fetched_at={libraries.fulfilledTimeStamp} />
              </Link>
              <button
                type='button'
                data-variant='glyph'
                className={styles.more}
                aria-label={`Menu for ${library_name(library)}`}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  set_menu({ x: rect.left, y: rect.bottom, library })
                }}
              >
                …
              </button>
            </div>
          )
        })}
        {libraries.isSuccess && others.length === 0 && <p className={styles.none}>none linked</p>}
      </div>
      <div className={styles.footer}>
        <div className={styles.footer_row}>
          <Link to={ROUTES.identity} className={styles.identity} aria-label='Identity' aria-current={is_current(ROUTES.identity) ? 'page' : undefined}>
            <Avatar name={identity?.name ?? ''} size={28} cid={identity?.avatar} pattern={public_key === undefined ? undefined : key_pattern(public_key)} />
            {identity_name !== null && <span className={styles.name}>{identity_name}</span>}
          </Link>
          <Link to={ROUTES.settings} className={styles.gear} aria-label='Settings' title='Settings' aria-current={is_current(ROUTES.settings) ? 'page' : undefined}><SettingsIcon /></Link>
        </div>
        <Link to={settings_route('peers')} className={styles.status}><ConnectionStatus /></Link>
      </div>
      {menu !== null && <ContextMenu x={menu.x} y={menu.y} items={actions.menu_items(menu.library)} on_close={() => { set_menu(null) }} />}
      {actions.dialogs}
    </nav>
  )
}
