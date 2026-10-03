// The diagnostics surface (spec §8.9.1): versions, mode, paths, memory, and
// the bundled node's process; and moving the bundled node's data directory
// (§8.4.1), which asks first and restarts the node there.

import { app, BrowserWindow, dialog } from 'electron'

import type { Diagnostics, NodeResult } from '#shared/bridge.ts'
import { logs_dir, save_data_dir } from './bundled/bundled-node.ts'
import { prepare_data_dir, resolve_data_dir_target } from './bundled/data-dir-target.ts'
import type { create_node_manager } from './bundled/node-manager.ts'
import type { ConnectionStore } from './connection-store.ts'
import type { create_update_service } from './updates.ts'
import type { create_node_connection } from './node-connection.ts'

export const create_diagnostics = ({ user_data, store, manager, connection, updates }: {
  user_data: string
  store: ConnectionStore
  manager: ReturnType<typeof create_node_manager>
  connection: ReturnType<typeof create_node_connection>
  updates: ReturnType<typeof create_update_service>
}) => ({
  collect: (): Diagnostics => {
    const update = updates.get_state()
    const processes = app.getAppMetrics().map(({ type, pid, memory }) => ({ type, pid, working_set_bytes: memory.workingSetSize * 1024 }))
    return {
      app_version: app.getVersion(),
      electron_version: process.versions.electron ?? '',
      chrome_version: process.versions.chrome ?? '',
      node_version: process.versions.node,
      platform: `${process.platform} ${process.arch}`,
      mode: store.get().mode,
      node_url: connection.node_url(),
      node_key: connection.node_key(),
      user_data,
      logs_dir: logs_dir(user_data),
      bundled: manager.get_state(),
      updates: {
        status: update.status,
        detail: update.status === 'off' ? update.reason : update.status === 'error' ? update.message : 'version' in update ? update.version : null
      },
      memory: {
        main_rss_bytes: process.memoryUsage().rss,
        total_working_set_bytes: processes.reduce((total, { working_set_bytes }) => total + working_set_bytes, 0),
        processes
      }
    }
  },
  choose_data_dir: async (): Promise<NodeResult<string | null>> => {
    const window = BrowserWindow.getFocusedWindow() ?? undefined
    const current = manager.get_state().data_dir
    const picked = await dialog.showOpenDialog(...(window === undefined ? [] : [window]) as [BrowserWindow], {
      title: 'Choose where the bundled node keeps its data',
      defaultPath: current,
      properties: ['openDirectory', 'createDirectory']
    })
    const chosen = picked.filePaths[0]
    if (picked.canceled || chosen === undefined) return { ok: true, data: null }
    // Spec §8.10.9: the path is canonicalized before anything uses it, and
    // the node gets its own subfolder of the chosen one.
    const target = await resolve_data_dir_target({ chosen, current, user_data, app_path: app.getAppPath() })
    if (target.kind === 'unchanged') return { ok: true, data: null }
    if (target.kind === 'refused') return { ok: false, failure: { kind: 'refused', message: target.message } }
    const next = target.data_dir
    const options = {
      type: 'warning' as const,
      buttons: ['Cancel', 'Use this folder'],
      defaultId: 0,
      cancelId: 0,
      message: 'Move the bundled node to this folder?',
      detail: target.kind === 'existing'
        ? `${next} already holds a node's data; the bundled node uses it and restarts. The current data stays in ${current}.`
        : `The bundled node keeps its data in a new folder, ${next}, private to your user account, and restarts. It starts there with a new, empty library and a new identity; the app does not move the existing data, which stays in ${current} until you move it yourself.`
    }
    const { response } = window === undefined ? await dialog.showMessageBox(options) : await dialog.showMessageBox(window, options)
    if (response !== 1) return { ok: true, data: null }
    await prepare_data_dir(target)
    await save_data_dir(user_data, next)
    await manager.relocate({ next_data_dir: next, start: store.get().mode === 'bundled' })
    connection.sync()
    return { ok: true, data: next }
  }
})
