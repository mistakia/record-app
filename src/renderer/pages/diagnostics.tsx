// Diagnostics (spec §8.9.1): what a bug report needs, collected by main and
// refreshed every few seconds, with the event connection's state from the
// store. Works without a node.

import { useEffect, useState } from 'react'

import styles from './diagnostics.module.css'
import type { Diagnostics as DiagnosticsData } from '#shared/bridge.ts'
import { use_app_selector } from '#renderer/store/index.ts'

const REFRESH_MS = 5000

const mebibytes = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MiB`

const duration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours} h ${minutes} min` : minutes > 0 ? `${minutes} min ${seconds % 60} s` : `${seconds} s`
}

export const Diagnostics = () => {
  const [data, set_data] = useState<DiagnosticsData | null>(null)
  const [now, set_now] = useState(Date.now())
  const events = use_app_selector((state) => state.connection.events)
  const freshness = use_app_selector((state) => state.connection.freshness)

  useEffect(() => {
    let live = true
    const load = () => {
      window.record.diagnostics.get().then((next) => {
        if (!live) return
        set_data(next)
        set_now(Date.now())
      }).catch(() => {})
    }
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [])

  if (data === null) return <section className={styles.page}><h1>Diagnostics</h1><p>Collecting.</p></section>
  const { bundled } = data
  const running = bundled.status === 'running' && bundled.started_at_ms !== null
  return (
    <section className={styles.page} data-testid='diagnostics'>
      <h1>Diagnostics</h1>
      <h2>App</h2>
      <dl className={styles.details}>
        <dt>Version</dt><dd data-testid='diagnostics-app-version'>{data.app_version}</dd>
        <dt>Electron</dt><dd>{data.electron_version} (Chromium {data.chrome_version}, Node {data.node_version})</dd>
        <dt>Platform</dt><dd>{data.platform}</dd>
        <dt>App data</dt><dd><code>{data.user_data}</code></dd>
        <dt>Logs</dt><dd><code>{data.logs_dir}</code></dd>
        <dt>Updates</dt><dd data-testid='diagnostics-updates'>{data.updates.status}{data.updates.detail === null ? '' : `: ${data.updates.detail}`}</dd>
      </dl>
      <h2>Connection</h2>
      <dl className={styles.details}>
        <dt>Mode</dt><dd data-testid='diagnostics-mode'>{data.mode === 'bundled' ? 'Bundled node' : 'Remote node'}</dd>
        <dt>Node URL</dt><dd><code>{data.node_url ?? 'none'}</code></dd>
        <dt>Node key</dt><dd><code>{data.node_key ?? 'none'}</code></dd>
        <dt>Events</dt>
        <dd data-testid='diagnostics-events'>
          {events === null ? 'not started' : events.status}
          {events !== null && events.attempt > 0 ? `, attempt ${events.attempt}` : ''}
          {events?.last_error != null ? `: ${events.last_error}` : ''}
        </dd>
        <dt>Data</dt><dd>{freshness}</dd>
      </dl>
      <h2>Bundled node</h2>
      <dl className={styles.details}>
        <dt>Status</dt><dd data-testid='diagnostics-bundled-status'>{bundled.status}{bundled.error === null ? '' : `: ${bundled.error}`}</dd>
        <dt>record-node</dt><dd>{bundled.version}</dd>
        <dt>Process</dt><dd data-testid='diagnostics-bundled-pid'>{bundled.pid === null ? 'none' : `PID ${bundled.pid}`}</dd>
        <dt>Uptime</dt><dd>{running ? duration(now - (bundled.started_at_ms ?? now)) : 'not running'}</dd>
        <dt>Port</dt><dd>{bundled.port ?? 'none'}</dd>
        <dt>Restarts failed</dt><dd>{bundled.failed_restarts}</dd>
        <dt>Data directory</dt><dd><code>{bundled.data_dir}</code></dd>
        <dt>Log</dt><dd><code>{bundled.log_path}</code></dd>
      </dl>
      <h2>Memory</h2>
      <dl className={styles.details}>
        <dt>Main process</dt><dd>{mebibytes(data.memory.main_rss_bytes)} resident</dd>
        <dt>All app processes</dt><dd data-testid='diagnostics-memory'>{mebibytes(data.memory.total_working_set_bytes)} working set</dd>
        {data.memory.processes.map(({ type, pid, working_set_bytes }) => (
          <div key={pid} className={styles.row}><dt>{type}</dt><dd>PID {pid}, {mebibytes(working_set_bytes)}</dd></div>
        ))}
      </dl>
    </section>
  )
}
