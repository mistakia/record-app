// The bundled node, read-only (spec §8.3.5): its port, data directory, and
// pinned version, with its state and the actions a failure needs.

import styles from './bundled-details.module.css'
import type { BundledState } from '#shared/bridge.ts'

const STATUS_LABELS: Record<BundledState['status'], string> = {
  stopped: 'Stopped',
  starting: 'Starting',
  running: 'Running',
  restarting: 'Restarting',
  failed: 'Failed'
}

export const BundledDetails = ({ state }: { state: BundledState | null }) => {
  if (state === null) return <p className={styles.muted}>Reading the bundled node's state.</p>
  return (
    <dl className={styles.details} data-testid='bundled-details' data-status={state.status}>
      <dt>Status</dt>
      <dd>{STATUS_LABELS[state.status]}{state.error === null ? '' : `: ${state.error}`}</dd>
      <dt>Port</dt>
      <dd>{state.port ?? 'not chosen yet'}</dd>
      <dt>Data directory</dt>
      <dd>
        <code>{state.data_dir}</code>{' '}
        <button type='button' onClick={() => { window.record.bundled.open_data_dir().catch(() => {}) }}>Open</button>
      </dd>
      <dt>record-node</dt>
      <dd data-testid='bundled-version'>{state.version}</dd>
      <dt>Log</dt>
      <dd>
        <code>{state.log_path}</code>{' '}
        <button type='button' onClick={() => { window.record.bundled.open_log().catch(() => {}) }}>Show</button>
      </dd>
      {state.ingest_disabled !== null && (
        <>
          <dt>Ingest</dt>
          <dd data-testid='bundled-ingest'>Off: {state.ingest_disabled}</dd>
        </>
      )}
    </dl>
  )
}
