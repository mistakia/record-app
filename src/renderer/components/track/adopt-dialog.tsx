// Adoption (spec §8.6.7, §8.9.1): copy a track's entry into a chosen
// writable library, an own one or a shared one whose capability grants
// library.append_track, by its content CID (POST /tracks). Libraries that
// already hold the track (Track.library_addresses) are not offered.

import { useState } from 'react'

import styles from './adopt-dialog.module.css'
import type { Track } from '#renderer/api/types.ts'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { TargetSelect, use_write_target } from '#renderer/components/library/target-select.tsx'
import { target_fields } from '#renderer/library/write-targets.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

export const AdoptDialog = ({ track, viewed_library, on_close }: { track: Track, viewed_library: string, on_close: () => void }) => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const choice = use_write_target({ action: 'library.append_track', exclude: [...(viewed_library === '' ? [] : [viewed_library]), ...(track.library_addresses ?? [])] })
  const [busy, set_busy] = useState(false)
  const { target } = choice

  const adopt = async () => {
    if (target === null) return
    set_busy(true)
    const adopted = await report_write({
      dispatch,
      write: dispatch(node_api.endpoints.add_track_by_cid.initiate({ content_cid: track.content_cid, ...target_fields(target) })),
      success: `Adopted into ${choice.name_of(target.library_address)}.`
    })
    set_busy(false)
    if (adopted === null) return
    choice.used(target)
    on_close()
  }

  return (
    <Dialog open title={`Adopt: ${track.title ?? 'Untitled'}`} on_close={on_close}>
      <div className={styles.dialog} data-testid='adopt-dialog'>
        <p>Copy this track into one of your libraries, or a shared library you can add tracks to.</p>
        <TargetSelect choice={choice} />
        <div className={styles.actions}>
          <button type='button' onClick={on_close}>Cancel</button>
          <button type='button' disabled={!writes_allowed || busy || target === null} onClick={() => { adopt().catch(() => {}) }}>Adopt</button>
        </div>
      </div>
    </Dialog>
  )
}
