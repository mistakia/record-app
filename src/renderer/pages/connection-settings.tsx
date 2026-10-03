// Spec §8.3.5: the bundled or remote selector, the remote node URL and
// access token, the bundled node's read-only details, test connection, and
// save or cancel. The token goes to main, which keeps it in the Keychain and
// never hands it back; the page only learns whether one is saved (§8.7.3).
// A save that changes mode asks first (§8.3.4). Save tears down everything
// tied to the old node (playback, the query cache) and reinitializes
// against the new one.

import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import styles from './connection-settings.module.css'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { SnapshotControls } from '#renderer/components/common/snapshot-controls.tsx'
import { BundledDetails } from '#renderer/components/layout/bundled-details.tsx'
import { stop_playback } from '#renderer/player/player-controller.ts'
import { node_api } from '#renderer/store/api.ts'
import { connection_loaded, events_state_changed, node_switch_started } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { replication_reset } from '#renderer/store/replication.ts'
import type { ConnectionMode, ConnectionTest, NodeResult } from '#shared/bridge.ts'
import { check_node_url } from '#shared/node-url.ts'
import { check_token } from '#shared/token.ts'

const SWITCH_TEXT: Record<ConnectionMode, string> = {
  bundled: 'Switch to the bundled node? The app disconnects from the remote node and starts its own node on this device. The remote node and its library are not changed.',
  remote: 'Switch to a remote node? The bundled node stops. Its library stays on this device, unused, until you switch back.'
}

export const ConnectionSettings = () => {
  const dispatch = use_app_dispatch()
  const navigate = useNavigate()
  const saved = use_app_selector((state) => state.connection.config)
  const bundled = use_app_selector((state) => state.bundled.state)
  const saved_mode = saved?.mode ?? 'bundled'
  const saved_url = saved?.node_url ?? null
  const [mode, set_mode] = useState<ConnectionMode>(saved_mode)
  const [node_url, set_node_url] = useState(saved_url ?? '')
  const [token, set_token] = useState('')
  const [logging_out, set_logging_out] = useState(false)
  // A test result belongs to the target it tested; once that changes, a
  // result that arrives late is never shown.
  const [tested, set_tested] = useState<{ target: string, result: NodeResult<ConnectionTest> } | null>(null)
  const [testing, set_testing] = useState(false)
  const [saving, set_saving] = useState(false)
  const [confirming, set_confirming] = useState(false)
  const [save_error, set_save_error] = useState<string | null>(null)
  // Guards a second submit that lands before the disabled button re-renders.
  const save_pending = useRef(false)

  const checked = check_node_url(node_url)
  const entered_token = mode === 'remote' ? token.trim() : ''
  const token_check = entered_token === '' ? null : check_token(entered_token)
  const target = mode === 'bundled' ? 'bundled' : `${node_url} ${entered_token}`
  const test_result = tested?.target === target ? tested.result : null
  const can_save = mode === 'bundled' || (checked.ok && token_check?.ok !== false)
  // Bundled mode keeps the last remote URL, so switching back offers it.
  const config = {
    mode,
    node_url: mode === 'remote' ? node_url : (checked.ok ? checked.node_url : saved_url),
    ...(entered_token === '' ? {} : { token: entered_token })
  }
  // The saved token belongs to the saved remote URL only.
  const auth = saved?.mode === 'remote' && mode === 'remote' && checked.ok && checked.node_url === saved_url ? saved.auth : null

  const logout = async () => {
    set_logging_out(true)
    set_save_error(null)
    try {
      const result = await window.record.connection.logout()
      if (result.ok) dispatch(connection_loaded(result.data))
      else set_save_error(result.failure.message)
    } catch (error) {
      set_save_error(`Logging out failed: ${String(error)}`)
    } finally {
      set_logging_out(false)
    }
  }

  const run_test = async () => {
    set_testing(true)
    const tested_target = target
    try {
      set_tested({ target: tested_target, result: await window.record.connection.test(config) })
    } catch (error) {
      set_tested({ target: tested_target, result: { ok: false, failure: { kind: 'refused', message: String(error) } } })
    } finally {
      set_testing(false)
    }
  }

  const save = async () => {
    save_pending.current = true
    set_saving(true)
    set_save_error(null)
    try {
      dispatch(node_switch_started())
      const result = await window.record.connection.save(config)
      if (!result.ok) {
        set_save_error(result.failure.message)
        // Nothing switched: show the connection as main still has it.
        dispatch(events_state_changed(await window.record.events.get_state()))
        dispatch(connection_loaded(await window.record.connection.get()))
        return
      }
      dispatch(replication_reset())
      stop_playback()
      dispatch(node_api.util.resetApiState())
      dispatch(connection_loaded(result.data))
      set_token('')
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
    if (save_pending.current || !can_save) return
    if (mode !== saved_mode) set_confirming(true)
    else save().catch(() => {})
  }

  const cancel = () => {
    set_mode(saved_mode)
    set_node_url(saved_url ?? '')
    set_token('')
    set_save_error(null)
  }

  return (
    <>
      <form className={styles.form} onSubmit={submit}>
        <h1>Connection</h1>
        <fieldset className={styles.modes}>
          <legend>Mode</legend>
          <label>
            <input type='radio' name='mode' value='bundled' checked={mode === 'bundled'} onChange={() => { set_mode('bundled') }} />
            Bundled node, run by this app on this device
          </label>
          <label>
            <input type='radio' name='mode' value='remote' checked={mode === 'remote'} onChange={() => { set_mode('remote') }} />
            Remote node
          </label>
        </fieldset>
        {mode === 'bundled'
          ? <BundledDetails state={bundled} />
          : (
            <>
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
              <label className={styles.field}>
                Access token
                <input
                  name='token'
                  type='password'
                  autoComplete='off'
                  spellCheck={false}
                  placeholder={auth?.status === 'saved' ? 'Saved; enter a new one to replace it' : 'Only if the node requires one'}
                  value={token}
                  onChange={(event) => { set_token(event.target.value) }}
                />
              </label>
              {token_check?.ok === false && <p className={styles.error}>{token_check.reason}</p>}
              {auth?.status === 'saved' && (
                <p className={styles.token_status} data-testid='token-status'>
                  {auth.persistent ? 'A token for this node is saved in the Keychain.' : 'A token for this node is held until the app quits.'}
                  <button type='button' disabled={logging_out} onClick={() => { logout().catch(() => {}) }}>{logging_out ? 'Logging out' : 'Log out'}</button>
                </p>
              )}
              {auth?.status === 'rejected' && (
                <p className={styles.error} data-testid='token-status'>The node refused its token, which has been deleted. Enter a valid token to reconnect.</p>
              )}
              {auth?.status === 'required' && (
                <p className={styles.error} data-testid='token-status'>The node requires an access token. Enter one to connect.</p>
              )}
              {auth !== null && !auth.persistent && auth.status === 'none' && (
                <p className={styles.warning}>On this platform a token is kept only until the app quits.</p>
              )}
            </>
            )}
        <div className={styles.actions}>
          <button type='button' disabled={!can_save || testing} onClick={() => { run_test().catch(() => {}) }}>
            {testing ? 'Testing' : 'Test connection'}
          </button>
          <button type='submit' disabled={!can_save || saving}>{saving ? 'Saving' : 'Save'}</button>
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
      <Dialog open={confirming} title='Switch mode' on_close={() => { set_confirming(false) }}>
        <p>{SWITCH_TEXT[mode]} Playback stops, and the offline snapshot is cleared.</p>
        <div className={styles.actions}>
          <button type='button' onClick={() => { set_confirming(false) }}>Cancel</button>
          <button type='button' onClick={() => { set_confirming(false); save().catch(() => {}) }}>Switch</button>
        </div>
      </Dialog>
      <SnapshotControls />
    </>
  )
}
