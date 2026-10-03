// Spec §8.3.5: mode selector, node URL, test connection, and save or cancel.
// Save tears down everything tied to the old node (playback, the query
// cache) and reinitializes against the new one.

import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import styles from './connection-settings.module.css'
import { SnapshotControls } from '#renderer/components/common/snapshot-controls.tsx'
import { stop_playback } from '#renderer/player/player-controller.ts'
import { node_api } from '#renderer/store/api.ts'
import { connection_loaded, node_switch_started } from '#renderer/store/connection.ts'
import { replication_reset } from '#renderer/store/replication.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import type { ConnectionTest, NodeResult } from '#shared/bridge.ts'
import { check_node_url } from '#shared/node-url.ts'

export const ConnectionSettings = () => {
  const dispatch = use_app_dispatch()
  const navigate = useNavigate()
  const saved_url = use_app_selector((state) => state.connection.config?.node_url ?? null)
  const [node_url, set_node_url] = useState(saved_url ?? '')
  // A test result belongs to the URL it tested; once the field changes, a
  // result that arrives late for the old URL is never shown.
  const [tested, set_tested] = useState<{ node_url: string, result: NodeResult<ConnectionTest> } | null>(null)
  const [testing, set_testing] = useState(false)
  const [saving, set_saving] = useState(false)
  // Guards a second submit that lands before the disabled button re-renders.
  const save_pending = useRef(false)
  const [save_error, set_save_error] = useState<string | null>(null)

  const checked = check_node_url(node_url)
  const config = { mode: 'remote' as const, node_url }
  const test_result = tested?.node_url === node_url ? tested.result : null

  const run_test = async () => {
    set_testing(true)
    const tested_url = node_url
    try {
      set_tested({ node_url: tested_url, result: await window.record.connection.test({ mode: 'remote', node_url: tested_url }) })
    } catch (error) {
      set_tested({ node_url: tested_url, result: { ok: false, failure: { kind: 'refused', message: String(error) } } })
    } finally {
      set_testing(false)
    }
  }

  const save = async () => {
    save_pending.current = true
    set_saving(true)
    set_save_error(null)
    try {
      const result = await window.record.connection.save(config)
      if (!result.ok) {
        set_save_error(result.failure.message)
        return
      }
      dispatch(node_switch_started())
      dispatch(replication_reset())
      stop_playback()
      dispatch(node_api.util.resetApiState())
      dispatch(connection_loaded(result.data))
      navigate('/tracks')
    } catch (error) {
      set_save_error(`Saving failed: ${String(error)}`)
    } finally {
      save_pending.current = false
      set_saving(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (save_pending.current || !checked.ok) return
    save().catch(() => {})
  }

  const cancel = () => {
    set_node_url(saved_url ?? '')
    set_save_error(null)
  }

  return (
    <>
      <form className={styles.form} onSubmit={submit}>
        <h1>Connection</h1>
        <fieldset className={styles.modes}>
          <legend>Mode</legend>
          <label>
            <input type='radio' name='mode' value='bundled' disabled />
            Bundled node (not available yet)
          </label>
          <label>
            <input type='radio' name='mode' value='remote' checked readOnly />
            Remote node
          </label>
        </fieldset>
        <label className={styles.field}>
          Node URL
          <input
            name='node_url'
            type='text'
            placeholder='http://127.0.0.1:3000'
            spellCheck={false}
            value={node_url}
            onChange={(event) => { set_node_url(event.target.value) }}
          />
        </label>
        {node_url !== '' && !checked.ok && <p className={styles.error}>{checked.reason}</p>}
        {checked.ok && checked.warning !== null && <p className={styles.warning}>{checked.warning}</p>}
        <div className={styles.actions}>
          <button type='button' disabled={!checked.ok || testing} onClick={() => { run_test().catch(() => {}) }}>
            {testing ? 'Testing' : 'Test connection'}
          </button>
          <button type='submit' disabled={!checked.ok || saving}>{saving ? 'Saving' : 'Save'}</button>
          <button type='button' disabled={saving} onClick={cancel}>Cancel</button>
        </div>
        {test_result?.ok === true && (
          <p className={styles.success} data-testid='connection-test-result'>
            Connected to peer {test_result.data.peer_id}
            {test_result.data.version !== null && ` (record-node ${test_result.data.version})`}
          </p>
        )}
        {test_result?.ok === false && <p className={styles.error} data-testid='connection-test-result'>{test_result.failure.message}</p>}
        {save_error !== null && <p className={styles.error}>{save_error}</p>}
      </form>
      <SnapshotControls />
    </>
  )
}
