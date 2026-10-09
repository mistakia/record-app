// Recently Played (GET /listens): tracks by most recent listen, through the
// same list as Tracks, with no tag strip or search; rows keep every action.

import { useRef, useState } from 'react'
import { Link } from 'react-router'

import styles from './listens.module.css'
import { EmptyState } from '#renderer/components/common/empty-state.tsx'
import { own_library_address } from '#renderer/components/library/library-category.ts'
import { listens_args } from '#renderer/components/track/list-source.ts'
import { Inspector } from '#renderer/components/track/inspector.tsx'
import { TrackList } from '#renderer/components/track/track-list.tsx'
import { use_inspector_fit } from '#renderer/components/track/use-inspector-fit.ts'
import { use_tag_navigation, use_track_actions } from '#renderer/components/track/use-track-actions.tsx'
import { ROUTES } from '#renderer/routes.ts'
import { node_api } from '#renderer/store/api.ts'

export const Listens = () => {
  const listens = node_api.endpoints.get_listens.useQuery(listens_args(0))
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const [inspecting, set_inspecting] = useState(false)
  const body_ref = useRef<HTMLDivElement>(null)
  use_inspector_fit({ body: body_ref, open: inspecting, close: () => { set_inspecting(false) } })
  const total = listens.data?.total ?? 0
  const { actions, dialogs } = use_track_actions({
    viewed_library: '',
    listen_library: own_library_address(libraries.data) ?? '',
    source: { route: ROUTES.listens, label: 'Recently played', subtitle: null, library_address: '' },
    on_tag_clicked: use_tag_navigation(),
    toggle_inspector: () => { set_inspecting((open) => !open) },
    clear_search: () => false,
    close_pane: () => {
      if (!inspecting) return false
      set_inspecting(false)
      return true
    }
  })

  return (
    <section className={styles.page}>
      {listens.error !== undefined && <p className={styles.error}>!! {'message' in listens.error ? listens.error.message : 'The node request failed.'}</p>}
      {listens.isSuccess && total === 0
        ? <EmptyState headline='Nothing yet' detail='Tracks you play show here, newest first.' action={<Link to={ROUTES.tracks}>Tracks</Link>} testid='listens-empty' />
        : (
          <div ref={body_ref} className={styles.body} data-testid='listens'>
            <TrackList source={{ kind: 'listens' }} view_key={ROUTES.listens} total={total} busy={listens.isFetching} actions={actions} />
            {inspecting && <Inspector source={{ kind: 'listens' }} on_close={() => { set_inspecting(false) }} />}
          </div>
          )}
      {dialogs}
    </section>
  )
}
