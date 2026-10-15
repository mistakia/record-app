// A library's collection map: its profile views, carried as `view/<slug>`
// labels, as cards with their track counts. A card opens the library's track
// list filtered to the view. Read on its own query, apart from the About
// editor, so it never holds up a profile save.

import { Link } from 'react-router'

import styles from './collection-map.module.css'
import { tracks_route } from '#renderer/routes.ts'
import { DEFAULT_TRACK_FILTERS, node_api } from '#renderer/store/api.ts'
import { label_value } from '#renderer/store/label-facets.ts'

const VIEW_PREFIX = 'view/'

export const CollectionMap = ({ library_address }: { library_address: string }) => {
  const views = node_api.endpoints.get_tags.useQuery({ library_addresses: [library_address], prefix: VIEW_PREFIX })
  if (views.isLoading) return null
  if (views.isError) return <p className={styles.muted}>!! The node did not answer for this library's views.</p>
  const cards = [...(views.data ?? [])].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
  if (cards.length === 0) return <p className={styles.muted}>No views yet. A track labelled view/&lt;name&gt; shows here.</p>
  return (
    <ul className={styles.cards} data-testid='collection-map'>
      {cards.map(({ tag, count }) => (
        <li key={tag}>
          <Link className={styles.card} to={tracks_route({ library_address, filters: { ...DEFAULT_TRACK_FILTERS, tags: [tag] } })}>
            <span className={styles.name}>{label_value(tag)}</span>
            <span className={styles.count}>{count} tracks</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
