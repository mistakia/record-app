// The node-unreachable state (spec §8.7.8) and the staleness indicator
// (§8.8.3), shown across every page while they hold.

import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import styles from './connection-banner.module.css'
import { use_app_selector } from '#renderer/store/index.ts'

const seconds_until = (time_ms: number | null, now_ms: number): number =>
  time_ms === null ? 0 : Math.max(0, Math.ceil((time_ms - now_ms) / 1000))

export const ConnectionBanner = () => {
  const events = use_app_selector((state) => state.connection.events)
  const freshness = use_app_selector((state) => state.connection.freshness)
  const [now_ms, set_now_ms] = useState(Date.now())
  const retrying = events?.status === 'reconnecting'

  useEffect(() => {
    if (!retrying) return
    const timer = setInterval(() => { set_now_ms(Date.now()) }, 1000)
    return () => { clearInterval(timer) }
  }, [retrying])

  if (events === null || events.status === 'idle' || events.status === 'closed') return null

  // Spec §8.7.3: a refused token is forgotten, and nothing is sent until
  // the user enters a new one.
  if (events.status === 'unauthorized') {
    return (
      <div className={styles.unreachable} role='alert' data-testid='node-unauthorized'>
        <span>
          The node at {events.node_url} refused this app's access. It needs a valid access token, and nothing is sent to it until you enter one.
        </span>
        <Link to='/connection'>Enter a token</Link>
      </div>
    )
  }

  if (retrying) {
    return (
      <div className={styles.unreachable} role='alert' data-testid='node-unreachable'>
        <span>
          Node unreachable at {events.node_url}. {events.last_error} Retrying in {seconds_until(events.retry_at_ms, now_ms)} s.
          {' '}Data shown may be out of date, and changes are paused.
        </span>
        <button type='button' onClick={() => { window.record.events.reconnect_now().catch(() => {}) }}>Retry now</button>
      </div>
    )
  }

  if (freshness !== 'fresh') {
    return (
      <div className={styles.stale} role='status' data-testid='data-stale'>
        {events.status === 'connecting' ? 'Connecting to the node.' : 'Refreshing from the node.'} Data shown may be out of date, and changes are paused.
      </div>
    )
  }
  return null
}

const STATUS_LABELS = {
  idle: 'No node',
  connecting: 'Connecting',
  open: 'Live',
  reconnecting: 'Unreachable',
  unauthorized: 'Sign-in needed',
  closed: 'Disconnected'
} as const

// A compact indicator of the event connection, always visible (§8.7.7).
export const ConnectionStatus = () => {
  const status = use_app_selector((state) => state.connection.events?.status ?? 'idle')
  const freshness = use_app_selector((state) => state.connection.freshness)
  return (
    <span className={styles.status} data-testid='events-status' data-status={status} data-freshness={freshness}>
      <span className={`${styles.dot} ${styles[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  )
}
