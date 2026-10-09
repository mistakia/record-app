// Diagnostics (spec §8.9.1): what a bug report needs, collected by main and
// refreshed every few seconds, with the event connection's state from the
// store. Works without a node.

import { useEffect, useState } from 'react'

import styles from './diagnostics-section.module.css'
import { Screen } from '#renderer/components/common/screen.tsx'
import { ShowStrip } from '#renderer/components/common/show-strip.tsx'
import type { Diagnostics as DiagnosticsData, UpdateChannel } from '#shared/bridge.ts'
import { use_app_selector } from '#renderer/store/index.ts'

const REFRESH_MS = 5000

const mebibytes = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MiB`

const duration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours} h ${minutes} min` : minutes > 0 ? `${minutes} min ${seconds % 60} s` : `${seconds} s`
}

const CHANNEL_LABELS: Record<UpdateChannel, string> = {
  stable: 'Stable releases',
  beta: 'Beta releases'
}

export const DiagnosticsSection = () => {
  const [data, set_data] = useState<DiagnosticsData | null>(null)
  const [now, set_now] = useState(Date.now())
  const [channel_saving, set_channel_saving] = useState(false)
  const [channel_error, set_channel_error] = useState<string | null>(null)
  const events = use_app_selector((state) => state.connection.events)
  const freshness = use_app_selector((state) => state.connection.freshness)

  // The update channel a user picks (spec §8.2.5), shown from the next poll
  // and the payload the save returns.
  const set_channel = async (channel: UpdateChannel): Promise<void> => {
    if (data === null || channel === data.updates.channel) return
    set_channel_saving(true)
    set_channel_error(null)
    try {
      const saved = await window.record.updates.set_channel(channel)
      if (saved.ok) {
        set_data({ ...data, updates: { ...data.updates, channel: saved.data } })
      } else {
        set_channel_error(saved.failure.message)
      }
    } catch {
      // The realistic failure is the settings write itself rejecting.
      set_channel_error('The update channel could not be saved.')
    } finally {
      set_channel_saving(false)
    }
  }

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

  if (data === null) return <p className={styles.collecting}>Collecting.</p>
  const { bundled } = data
  const running = bundled.status === 'running' && bundled.started_at_ms !== null
  return (
    <div className={styles.section} data-testid='diagnostics'>
      <Screen className={styles.live} data-testid='diagnostics-live'>
        <div className={styles.live_body}>
          <p className='screen-label'>live</p>
          <dl className={styles.live_details}>
            <dt>events</dt>
            <dd data-testid='diagnostics-events' className={events?.status === 'open' ? 'on-air' : undefined}>
              {events === null ? 'not started' : events.status}
              {events !== null && events.attempt > 0 ? `, attempt ${events.attempt}` : ''}
              {events?.last_error != null ? `: !! ${events.last_error}` : ''}
            </dd>
            <dt>data</dt><dd>{freshness}</dd>
            {/* The bundled node's rows; a remote node has none to show. */}
            {data.mode === 'bundled' && (
              <>
                <dt>node</dt><dd data-testid='diagnostics-bundled-status'>{bundled.status}{bundled.error === null ? '' : `: !! ${bundled.error}`}</dd>
                <dt>pid</dt><dd data-testid='diagnostics-bundled-pid'>{bundled.pid === null ? 'none' : `PID ${bundled.pid}`}</dd>
                <dt>uptime</dt><dd className='tabular'>{running ? duration(now - (bundled.started_at_ms ?? now)) : 'not running'}</dd>
              </>
            )}
            <dt>memory</dt><dd className='tabular' data-testid='diagnostics-memory'>{mebibytes(data.memory.total_working_set_bytes)} working set</dd>
          </dl>
        </div>
      </Screen>
      <dl className={styles.details}>
        <dt>Version</dt><dd data-testid='diagnostics-app-version'>{data.app_version}</dd>
        <dt>record-node</dt><dd>{bundled.version}</dd>
        <dt>Mode</dt><dd data-testid='diagnostics-mode'>{data.mode === 'bundled' ? 'Bundled node' : 'Remote node'}</dd>
        {data.node_url !== null && <><dt>Node URL</dt><dd><code>{data.node_url}</code></dd></>}
        <dt>Updates</dt><dd data-testid='diagnostics-updates'>{data.updates.status}{data.updates.detail === null ? '' : `: ${data.updates.detail}`}</dd>
        <dt>Update channel</dt>
        <dd>
          <fieldset className={styles.channels} disabled={channel_saving}>
            <legend className='visually-hidden'>Update channel</legend>
            {(['stable', 'beta'] as const).map((value) => (
              <label key={value}>
                <input type='radio' name='update-channel' value={value} checked={data.updates.channel === value} onChange={() => { set_channel(value).catch(() => {}) }} />
                {CHANNEL_LABELS[value]}
              </label>
            ))}
          </fieldset>
          {channel_error !== null && <p className={styles.channel_error}>{channel_error}</p>}
        </dd>
        {data.mode === 'bundled' && (
          <>
            <dt>Node data</dt>
            <dd><button type='button' data-size='small' onClick={() => { window.record.bundled.open_data_dir().catch(() => {}) }}>Show in Finder</button></dd>
            <dt>Node log</dt>
            <dd><button type='button' data-size='small' onClick={() => { window.record.bundled.open_log().catch(() => {}) }}>Show in Finder</button></dd>
          </>
        )}
      </dl>
      <ShowStrip label='details'>
        <dl className={styles.details}>
          <dt>Electron</dt><dd>{data.electron_version} (Chromium {data.chrome_version}, Node {data.node_version})</dd>
          <dt>Platform</dt><dd>{data.platform}</dd>
          <dt>Node key</dt><dd><code>{data.node_key ?? 'none'}</code></dd>
          <dt>App data</dt><dd><code>{data.user_data}</code></dd>
          <dt>Logs</dt><dd><code>{data.logs_dir}</code></dd>
          <dt>Port</dt><dd>{bundled.port ?? 'none'}</dd>
          <dt>Restarts failed</dt><dd>{bundled.failed_restarts}</dd>
          <dt>Data directory</dt><dd><code>{bundled.data_dir}</code></dd>
          <dt>Log</dt><dd><code>{bundled.log_path}</code></dd>
          <dt>Main process</dt><dd>{mebibytes(data.memory.main_rss_bytes)} resident</dd>
          {data.memory.processes.map(({ type, pid, working_set_bytes }) => (
            <div key={pid} className={styles.row}><dt>{type}</dt><dd>PID {pid}, {mebibytes(working_set_bytes)}</dd></div>
          ))}
        </dl>
      </ShowStrip>
    </div>
  )
}
