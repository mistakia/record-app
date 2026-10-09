// The bundled node's lifecycle across every page (spec §8.4.3, §8.4.4):
// starting, restarting after a crash, or failed with its stderr tail, the
// data directory, and retry and open actions.

import { useEffect, useState } from 'react'

import styles from './connection-banner.module.css'
import { use_app_selector } from '#renderer/store/index.ts'
import { MAX_FAILED_RESTARTS } from '#shared/bundled.ts'

export const BundledBanner = () => {
  const mode = use_app_selector((state) => state.connection.config?.mode)
  const bundled = use_app_selector((state) => state.bundled.state)
  const [now_ms, set_now_ms] = useState(Date.now())
  const restarting = bundled?.status === 'restarting'

  useEffect(() => {
    if (!restarting) return
    const timer = setInterval(() => { set_now_ms(Date.now()) }, 500)
    return () => { clearInterval(timer) }
  }, [restarting])

  if (mode !== 'bundled' || bundled === null || bundled.status === 'running' || bundled.status === 'stopped') return null

  if (bundled.status === 'starting') {
    return <div className={styles.stale} role='status' data-testid='bundled-banner' data-status='starting'><span className={styles.word}>● starting</span> Starting the bundled node.</div>
  }
  if (restarting) {
    const seconds = Math.max(0, Math.ceil(((bundled.retry_at_ms ?? now_ms) - now_ms) / 1000))
    return (
      <div className={styles.stale} role='status' data-testid='bundled-banner' data-status='restarting'>
        <span className={styles.word}>● restarting</span>
        {bundled.error} Restarting{seconds > 0 ? ` in ${seconds} s` : ''} (restart {bundled.failed_restarts} of {MAX_FAILED_RESTARTS}).
      </div>
    )
  }
  return (
    <div className={styles.unreachable} role='alert' data-testid='bundled-banner' data-status='failed'>
      <span className={styles.word}>!! node stopped</span>
      <span>
        {bundled.error} Its data is in <code>{bundled.data_dir}</code>.
        {bundled.stderr_tail !== null && (
          <details>
            <summary>Last output</summary>
            <pre>{bundled.stderr_tail}</pre>
          </details>
        )}
      </span>
      <button type='button' data-size='small' onClick={() => { window.record.bundled.restart().catch(() => {}) }}>Retry</button>
      <button type='button' data-size='small' onClick={() => { window.record.bundled.open_data_dir().catch(() => {}) }}>Open data folder</button>
    </div>
  )
}
