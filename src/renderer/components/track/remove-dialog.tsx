// Remove a track from an own library (spec §8.6.3): a DEL in that library's
// log, which no capability can authorise (§3.5.6), so only own active
// libraries holding the track (Track.library_addresses) are offered. Other
// libraries keep their entries.

import { useState } from 'react'

import styles from './adopt-dialog.module.css'
import type { Library, Track } from '#renderer/api/types.ts'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { library_name } from '#renderer/components/library/library-category.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

// The own active recordstores holding a track, the ones it can be removed from.
export const removable_from = ({ track, libraries }: { track: Track, libraries: readonly Library[] | undefined }): Library[] =>
  (libraries ?? []).filter((library) => library.is_own && !library.is_retired && library.library_type === 'recordstore' && (track.library_addresses ?? []).includes(library.address))

export const RemoveDialog = ({ track, viewed_library, on_close }: { track: Track, viewed_library: string, on_close: () => void }) => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const choices = removable_from({ track, libraries: libraries.data })
  const [chosen, set_chosen] = useState<string | null>(null)
  const target = choices.find(({ address }) => address === chosen) ?? choices.find(({ address }) => address === viewed_library) ?? (choices.length === 1 ? choices[0] : undefined)
  const [busy, set_busy] = useState(false)

  const remove = async () => {
    if (target === undefined) return
    set_busy(true)
    const removed = await report_write({
      dispatch,
      write: dispatch(node_api.endpoints.remove_track.initiate({ track_id: track.id, library_address: target.address })),
      success: `Removed from ${library_name(target)}.`
    })
    set_busy(false)
    if (removed.ok) on_close()
  }

  return (
    <Dialog open title={`Remove: ${track.title ?? 'Untitled'}`} on_close={on_close}>
      <div className={styles.dialog} data-testid='remove-dialog'>
        {choices.length === 0 && <p>This track is in none of your libraries.</p>}
        {choices.length > 1 && (
          <label>
            Remove from{' '}
            <select aria-label='Library to remove from' value={target?.address ?? ''} onChange={(event) => { set_chosen(event.target.value) }}>
              {target === undefined && <option value=''>Choose a library</option>}
              {choices.map((library) => <option key={library.address} value={library.address}>{library_name(library)}</option>)}
            </select>
          </label>
        )}
        {target !== undefined && (
          <p>
            Remove it from {library_name(target)}? Its entry there is deleted, and peers that replicate {library_name(target)} see it go.
            Other libraries holding it keep it.
          </p>
        )}
        <div className={styles.actions}>
          <button type='button' onClick={on_close}>Cancel</button>
          <button type='button' data-variant='danger' disabled={!writes_allowed || busy || target === undefined} onClick={() => { remove().catch(() => {}) }}>Remove</button>
        </div>
      </div>
    </Dialog>
  )
}
