// Spec §8.3.5: mode selector, node URL, test connection, and save or cancel.
// Save tears down everything tied to the old node (playback, the query
// cache) and reinitializes against the new one.

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import styles from './connection-settings.module.css'
import { stop_playback } from '#renderer/player/player-controller.ts'
import { node_api } from '#renderer/store/api.ts'
import { connection_loaded } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import type { ConnectionTest, NodeResult } from '#shared/bridge.ts'
import { check_node_url } from '#shared/node-url.ts'

export const ConnectionSettings = () => {
  const dispatch = use_app_dispatch()
  const navigate = useNavigate()
  const saved_url = use_app_selector((state) => state.connection.config?.node_url ?? null)
  const [node_url, set_node_url] = useState(saved_url ?? '')
  const [test_result, set_test_result] = useState<NodeResult<ConnectionTest> | null>(null)
  const [testing, set_testing] = useState(false)
  const [save_error, set_save_error] = useState<string | null>(null)

  const checked = check_node_url(node_url)
  const config = { mode: 'remote' as const, node_url }

  const run_test = async () => {
    set_testing(true)
    set_test_result(null)
    set_test_result(await window.record.connection.test(config))
    set_testing(false)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    set_save_error(null)
    const result = await window.record.connection.save(config)
    if (!result.ok) {
      set_save_error(result.failure.message)
      return
    }
    stop_playback()
    dispatch(node_api.util.resetApiState())
    dispatch(connection_loaded(result.data))
    navigate('/tracks')
  }

  const cancel = () => {
    set_node_url(saved_url ?? '')
    set_test_result(null)
    set_save_error(null)
  }

  return (
    <form className={styles.form} onSubmit={(event) => { save(event).catch(() => {}) }}>
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
          onChange={(event) => {
            set_node_url(event.target.value)
            set_test_result(null)
          }}
        />
      </label>
      {node_url !== '' && !checked.ok && <p className={styles.error}>{checked.reason}</p>}
      {checked.ok && checked.warning !== null && <p className={styles.warning}>{checked.warning}</p>}
      <div className={styles.actions}>
        <button type='button' disabled={!checked.ok || testing} onClick={() => { run_test().catch(() => {}) }}>
          {testing ? 'Testing' : 'Test connection'}
        </button>
        <button type='submit' disabled={!checked.ok}>Save</button>
        <button type='button' onClick={cancel}>Cancel</button>
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
  )
}
