// IPC handlers behind the preload bridge. Every argument from the renderer is
// untrusted and re-validated here (spec §8.10.3), and only the app's own
// window may call.

import { BrowserWindow, clipboard, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'

import { IPC_CHANNELS, type NodeResult } from '#shared/bridge.ts'
import { create_audio_downloads } from './audio-downloads.ts'
import type { create_node_manager } from './bundled/node-manager.ts'
import type { create_diagnostics } from './diagnostics.ts'
import { create_secret_clipboard } from './clipboard-expiry.ts'
import { AUDIO_EXTENSIONS, import_chosen_paths, import_dropped_files } from './import-files.ts'
import { check_write_target } from './write-target.ts'
import { check_connection_config, type ConnectionStore } from './connection-store.ts'
import { type SettingsStore } from './settings-store.ts'
import { get_audio, request_node, test_connection } from './node-client.ts'
import type { create_node_connection } from './node-connection.ts'
import type { NodeSession } from './node-session.ts'
import type { create_update_service } from './updates.ts'
import { serve_generic_request } from './request-policy.ts'
import { create_identity_access } from './identity-access.ts'
import type { SnapshotStore } from './snapshot-store.ts'
import { check_token } from '#shared/token.ts'
import { create_authed_call } from './authed-call.ts'

const CID = /^[A-Za-z0-9]{1,128}$/
const REQUEST_ID = /^[A-Za-z0-9-]{1,64}$/

const refuse = (message: string): NodeResult<never> => ({ ok: false, failure: { kind: 'refused', message } })

const is_plain_object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// The token a save or test carries: absent (keep or use the saved one), or
// a string that must pass check_token.
const entered_token = (input: unknown): { ok: true, token: string | undefined } | { ok: false, result: NodeResult<never> } => {
  const token = is_plain_object(input) ? input.token : undefined
  if (token === undefined || token === null || token === '') return { ok: true, token: undefined }
  const checked = check_token(token)
  return checked.ok ? { ok: true, token: checked.token } : { ok: false, result: refuse(checked.reason) }
}

export const register_ipc = ({ store, connection, manager, session, snapshots, diagnostics, settings, updates, is_app_frame }: {
  store: ConnectionStore
  connection: ReturnType<typeof create_node_connection>
  manager: ReturnType<typeof create_node_manager>
  session: NodeSession
  snapshots: SnapshotStore
  diagnostics: ReturnType<typeof create_diagnostics>
  settings: SettingsStore
  updates: ReturnType<typeof create_update_service>
  is_app_frame: (url: string) => boolean
}): { forget_identity: () => void } => {
  const authed = create_authed_call({ target: connection.target, unauthorized: connection.unauthorized })
  const handle = (channel: string, handler: (input: unknown, event: IpcMainInvokeEvent) => Promise<unknown>): void => {
    ipcMain.handle(channel, async (event: IpcMainInvokeEvent, input: unknown) => {
      const url = event.senderFrame?.url
      if (url === undefined || !is_app_frame(url)) return refuse('IPC from an unknown frame.')
      return await handler(input, event)
    })
  }

  const identity = create_identity_access({
    get_connection: () => ({ mode: store.get().mode, node_url: connection.node_url() }),
    call: async ({ request }) => await authed(async ({ node_url, token }) => await request_node({ node_url, token, request })),
    confirm_export: async ({ node_url, cleartext }) => {
      const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
      const options = {
        type: 'warning' as const,
        buttons: ['Cancel', 'Show private key'],
        defaultId: 0,
        cancelId: 0,
        message: 'Show this identity\'s private key?',
        detail: `Anyone with the private key controls the library it writes and can write as you. The node at ${node_url} will send it to this app` +
          (cleartext ? ' unencrypted over plain http, readable by anyone on the network path.' : '.')
      }
      const { response } = window === undefined ? await dialog.showMessageBox(options) : await dialog.showMessageBox(window, options)
      return response === 1
    }
  })
  handle(IPC_CHANNELS.connection_get, async () => connection.view())
  // Save is the teardown-and-reinitialize point (spec §8.3.4, §8.3.5): a
  // mode switch stops or starts the bundled node, the event connection moves
  // to the new node, and a different node wipes the snapshot (§8.8.3).
  handle(IPC_CHANNELS.connection_save, async (input) => {
    const token = entered_token(input)
    if (!token.ok) return token.result
    const checked = check_connection_config(input)
    if (!checked.ok) return checked
    if (token.token !== undefined && checked.data.mode !== 'remote') return refuse('An access token is only for a remote node.')
    // The token first, so a Keychain failure refuses the save before
    // anything moves.
    if (token.token !== undefined) {
      try {
        await connection.store_token({ node_url: checked.data.node_url as string, token: token.token })
      } catch (error) {
        return refuse(`The access token could not be stored, so nothing was saved: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    const previous_key = connection.node_key()
    const saved = await store.save(checked.data)
    if (!saved.ok) {
      // A token stored above may be the current node's: carry it now.
      connection.sync()
      return saved
    }
    identity.forget()
    // switched always points the session at the saved node, even when
    // starting the bundled node fails; that failure shows in its own state.
    await connection.switched().catch((error: unknown) => { console.error(error) })
    if (connection.node_key() !== previous_key) await snapshots.wipe()
    return { ok: true, data: connection.view() }
  })
  handle(IPC_CHANNELS.connection_logout, async () => {
    try {
      await connection.logout()
    } catch (error) {
      return refuse(`The access token could not be deleted: ${error instanceof Error ? error.message : String(error)}`)
    }
    return { ok: true, data: connection.view() }
  })
  handle(IPC_CHANNELS.connection_test, async (input) => {
    const token = entered_token(input)
    if (!token.ok) return token.result
    const checked = check_connection_config(input)
    if (!checked.ok) return checked
    if (checked.data.mode === 'bundled') {
      const { url } = manager.get_state()
      return url === null ? refuse('The bundled node is not running.') : await test_connection({ node_url: url })
    }
    const node_url = checked.data.node_url as string
    if (token.token !== undefined) return await test_connection({ node_url, token: token.token })
    // No token entered: test with the saved one, which a 401 then forgets.
    const target = connection.target()
    if (target === null || target.node_url !== node_url || store.get().mode !== 'remote') return await test_connection({ node_url })
    return await authed(async ({ token: saved }) => await test_connection({ node_url, token: saved }))
  })
  handle(IPC_CHANNELS.request, async (input) => await authed(async ({ node_url, token }) =>
    await serve_generic_request({ input, node_url, mode: store.get().mode, call: async (args) => await request_node({ ...args, token }) })))
  const audio_downloads = create_audio_downloads({
    download: async ({ cid, signal }) => await authed(async ({ node_url, token }) => await get_audio({ node_url, token, cid, signal }))
  })
  handle(IPC_CHANNELS.get_audio, async (input) => {
    const { cid, request_id } = is_plain_object(input) ? input : {}
    if (typeof cid !== 'string' || !CID.test(cid)) return refuse('Malformed audio CID.')
    if (typeof request_id !== 'string' || !REQUEST_ID.test(request_id)) return refuse('Malformed audio request id.')
    return await audio_downloads.start({ cid, request_id })
  })
  handle(IPC_CHANNELS.cancel_audio, async (input) => {
    const request_id = is_plain_object(input) ? input.request_id : undefined
    if (typeof request_id === 'string') audio_downloads.cancel(request_id)
  })

  handle(IPC_CHANNELS.import_choose_files, async (input, event) => {
    const target = check_write_target(is_plain_object(input) ? input.target : undefined)
    if (target === null) return refuse('An import must name its target library.')
    const window = BrowserWindow.fromWebContents(event.sender)
    const options = { title: 'Import audio files', properties: ['openFile', 'multiSelections'] as Array<'openFile' | 'multiSelections'>, filters: [{ name: 'Audio', extensions: AUDIO_EXTENSIONS }] }
    const chosen = window === null ? await dialog.showOpenDialog(options) : await dialog.showOpenDialog(window, options)
    if (chosen.canceled || chosen.filePaths.length === 0) return { ok: true, data: null }
    return await authed(async ({ node_url, token }) => await import_chosen_paths({ node_url, token, paths: chosen.filePaths, target }))
  })
  handle(IPC_CHANNELS.import_upload_files, async (input) => {
    const { files, target } = is_plain_object(input) ? input : { files: undefined, target: undefined }
    const checked = check_write_target(target)
    if (checked === null) return refuse('An import must name its target library.')
    return await authed(async ({ node_url, token }) => await import_dropped_files({ node_url, token, input: files, target: checked }))
  })
  handle(IPC_CHANNELS.identity_export, async () => await identity.export_identity())
  const secret_clipboard = create_secret_clipboard({
    clipboard: { readText: async () => await clipboard.readText(), writeText: async (text) => { await clipboard.writeText(text) }, clear: () => { clipboard.clear() } }
  })
  handle(IPC_CHANNELS.identity_copy_key, async (input) => {
    const text = is_plain_object(input) ? input.text : undefined
    if (typeof text !== 'string' || text === '' || text.length > 10_000) return refuse('Nothing to copy.')
    return { ok: true, data: await secret_clipboard.copy(text) }
  })
  handle(IPC_CHANNELS.identity_import, async (input) => {
    const result = await identity.import_identity(input)
    // The own library follows the key, so the node's key for per-node state changes.
    if (result.ok) await manager.refresh_identity()
    return result
  })
  handle(IPC_CHANNELS.identity_public_key, async () => await identity.public_key())

  handle(IPC_CHANNELS.bundled_get_state, async () => manager.get_state())
  // Only in bundled mode: the renderer cannot start a bundled node beside a
  // remote one (spec §8.3.6).
  handle(IPC_CHANNELS.bundled_restart, async () => {
    if (store.get().mode !== 'bundled') return refuse('The bundled node runs only in bundled mode.')
    await manager.restart()
    return { ok: true, data: null }
  })
  handle(IPC_CHANNELS.bundled_open_data_dir, async () => { await shell.openPath(manager.get_state().data_dir) })
  handle(IPC_CHANNELS.bundled_choose_data_dir, async () => await diagnostics.choose_data_dir())
  // Spec §8.3.5: saved first; a change stops the bundled node and starts it
  // again under the new privacy, Tor first when masked. (restart() only
  // recovers a node that gave up, and leaves a running one alone.)
  handle(IPC_CHANNELS.bundled_set_network_privacy, async (input) => {
    const previous = settings.get().network_privacy
    const saved = await settings.set_network_privacy(input)
    if (saved.ok && saved.data !== previous && store.get().mode === 'bundled') {
      await manager.stop()
      await manager.start()
    }
    return saved
  })
  handle(IPC_CHANNELS.diagnostics_get, async () => diagnostics.collect())
  handle(IPC_CHANNELS.bundled_open_log, async () => { shell.showItemInFolder(manager.get_state().log_path) })

  // The update channel (spec §8.2.5); the setting is saved first, and only a
  // saved change reaches the service.
  handle(IPC_CHANNELS.updates_set_channel, async (input) => {
    const saved = await settings.set_channel(input)
    if (saved.ok) updates.set_channel(saved.data)
    return saved
  })

  handle(IPC_CHANNELS.events_get_state, async () => session.get_state())
  handle(IPC_CHANNELS.events_reconnect_now, async () => { session.reconnect_now() })

  handle(IPC_CHANNELS.snapshot_load, async () => await snapshots.load(connection.node_key()))
  handle(IPC_CHANNELS.snapshot_update, async (input) => snapshots.update({ snapshot: input, node_key: connection.node_key() }))
  handle(IPC_CHANNELS.snapshot_get_info, async () => snapshots.get_info())
  handle(IPC_CHANNELS.snapshot_set_budget, async (input) => await snapshots.set_budget(input))
  handle(IPC_CHANNELS.snapshot_reset, async () => {
    await snapshots.wipe()
    return snapshots.get_info()
  })

  return { forget_identity: () => { identity.forget() } }
}
