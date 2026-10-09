// The 40px page head (STYLE.md § Layout › Page column): a drag region with
// the page title, or a library's profile header on its track list and its
// Profile and Sharing tabs.

import { useLocation } from 'react-router'

import styles from './page-head.module.css'
import { LibraryProfileHeader } from './library-profile-header.tsx'
import { own_libraries_of } from '#renderer/components/library/library-category.ts'
import { parse_track_view, ROUTES, type LibraryTab } from '#renderer/routes.ts'
import { node_api } from '#renderer/store/api.ts'

const TITLES: Record<string, string> = {
  [ROUTES.tracks]: 'All tracks',
  [ROUTES.listens]: 'Recently played',
  [ROUTES.libraries]: 'Libraries',
  [ROUTES.link_library]: 'Link a library',
  [ROUTES.new_library]: 'New library',
  [ROUTES.import]: 'Import',
  [ROUTES.identity]: 'Identity',
  [ROUTES.settings]: 'Settings'
}

const TAB_OF: Record<string, LibraryTab> = {
  [ROUTES.tracks]: 'tracks',
  [ROUTES.library_profile]: 'profile',
  [ROUTES.library_sharing]: 'sharing'
}

export const PageHead = () => {
  const { pathname, search } = useLocation()
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const own = node_api.endpoints.get_own_libraries.useQuery()
  const tab = TAB_OF[pathname]
  const viewed = tab === undefined ? '' : parse_track_view(new URLSearchParams(search)).library_address
  // The own list holds retired libraries, which GET /libraries may not.
  const library = viewed === ''
    ? undefined
    : libraries.data?.find(({ address }) => address === viewed) ?? own_libraries_of({ own: own.data, libraries: libraries.data }).find(({ address }) => address === viewed)

  return (
    <header className={styles.head} data-testid='page-head'>
      {library !== undefined
        ? <LibraryProfileHeader library={library} tab={tab ?? 'tracks'} />
        : <h1 className={styles.title}>{TITLES[pathname] ?? ''}</h1>}
    </header>
  )
}
