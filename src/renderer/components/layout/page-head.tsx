// The 40px page head (STYLE.md § Layout › Page column): a drag region with
// the page title, or a library's profile header on its track list and on
// the own library's Libraries page.

import { useLocation } from 'react-router'

import styles from './page-head.module.css'
import { LibraryProfileHeader } from './library-profile-header.tsx'
import { has_profile, own_libraries_of } from '#renderer/components/library/library-category.ts'
import { parse_track_view, ROUTES } from '#renderer/routes.ts'
import { node_api } from '#renderer/store/api.ts'

const TITLES: Record<string, string> = {
  [ROUTES.tracks]: 'All tracks',
  [ROUTES.listens]: 'Recently played',
  [ROUTES.libraries]: 'Libraries',
  [ROUTES.import]: 'Import',
  [ROUTES.identity]: 'Identity',
  [ROUTES.settings]: 'Settings'
}

export const PageHead = () => {
  const { pathname, search } = useLocation()
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const own = node_api.endpoints.get_own_libraries.useQuery()
  const viewed = pathname === ROUTES.tracks ? parse_track_view(new URLSearchParams(search)).library_address : ''
  const own_library = own_libraries_of({ own: own.data, libraries: libraries.data }).find(has_profile)
  const library = viewed !== ''
    ? libraries.data?.find(({ address }) => address === viewed)
    : pathname === ROUTES.libraries ? own_library : undefined

  return (
    <header className={styles.head} data-testid='page-head'>
      {library !== undefined
        ? <LibraryProfileHeader library={library} tab={pathname === ROUTES.libraries ? 'libraries' : 'tracks'} />
        : <h1 className={styles.title}>{TITLES[pathname] ?? ''}</h1>}
    </header>
  )
}
