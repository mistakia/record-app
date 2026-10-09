// Storage controls for the hibernation snapshot (spec §8.8.3): its current
// size against the user's limit, the limit itself (0 disables it), and a
// reset that wipes it.

import { useEffect, useState, type FormEvent } from 'react'

import styles from './snapshot-controls.module.css'
import { MAX_SNAPSHOT_BUDGET_BYTES, MEBIBYTE, type SnapshotInfo } from '#shared/snapshot.ts'

const format_mebibytes = (bytes: number): string => `${(bytes / MEBIBYTE).toFixed(bytes < MEBIBYTE ? 2 : 1)} MB`

export const SnapshotControls = () => {
  const [info, set_info] = useState<SnapshotInfo | null>(null)
  const [limit_mb, set_limit_mb] = useState('')
  const [message, set_message] = useState<string | null>(null)

  const show = (next: SnapshotInfo) => {
    set_info(next)
    set_limit_mb(String(next.budget_bytes / MEBIBYTE))
  }

  useEffect(() => {
    window.record.snapshot.get_info().then(show).catch(() => {})
  }, [])

  const save_limit = async (event: FormEvent) => {
    event.preventDefault()
    const budget_bytes = Math.round(Number(limit_mb) * MEBIBYTE)
    const result = await window.record.snapshot.set_budget({ budget_bytes })
    if (!result.ok) {
      set_message(result.failure.message)
      return
    }
    show(result.data)
    set_message(budget_bytes === 0 ? 'The snapshot is off.' : 'Limit saved.')
  }

  const reset = async () => {
    show(await window.record.snapshot.reset())
    set_message('Snapshot cleared.')
  }

  return (
    <form className={styles.controls} onSubmit={(event) => { save_limit(event).catch((error: unknown) => { set_message(String(error)) }) }}>
      <h3>Offline snapshot</h3>
      <p className={styles.hint}>
        The last-viewed libraries and tracks, kept so the app can show them at launch before the node answers. Never used in place of the node.
      </p>
      <p data-testid='snapshot-size'>
        {info === null ? 'Reading' : `${format_mebibytes(info.size_bytes)} used of ${format_mebibytes(info.budget_bytes)}`}
      </p>
      <label className={styles.limit}>
        <span>Limit <span className={styles.limit_hint}>in MB, 0 turns it off</span></span>
        <input
          type='number'
          min={0}
          max={MAX_SNAPSHOT_BUDGET_BYTES / MEBIBYTE}
          step={1}
          value={limit_mb}
          onChange={(event) => { set_limit_mb(event.target.value) }}
        />
      </label>
      <div className={styles.actions}>
        <button type='submit'>Save limit</button>
        <button type='button' onClick={() => { reset().catch((error: unknown) => { set_message(String(error)) }) }}>Clear snapshot</button>
      </div>
      {message !== null && <p className={styles.hint}>{message}</p>}
    </form>
  )
}
