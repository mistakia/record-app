// IPC handlers behind the preload bridge. Every argument from the renderer is
// untrusted and re-validated here (spec §8.10.3), and only the app's own
// window may call.

import { ipcMain, type IpcMainInvokeEvent } from 'electron'

import { API_ROUTES } from '#shared/api-routes.ts'
import { IPC_CHANNELS, type NodeRequest, type NodeResult } from '#shared/bridge.ts'
import { create_audio_downloads } from './audio-downloads.ts'
import { check_connection_config, type ConnectionStore } from './connection-store.ts'
import { get_audio, request_node, test_connection } from './node-client.ts'
import type { NodeSession } from './node-session.ts'
import type { SnapshotStore } from './snapshot-store.ts'

const METHODS = new Set<string>(API_ROUTES.map(({ method }) => method))
const CID = /^[A-Za-z0-9]{1,128}$/
const REQUEST_ID = /^[A-Za-z0-9-]{1,64}$/

const refuse = (message: string): NodeResult<never> => ({ ok: false, failure: { kind: 'refused', message } })

const is_plain_object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// The shape of a NodeRequest; build_api_path then checks the route itself,
// the parameter names, and the query values.
const check_node_request = (input: unknown): NodeRequest | null => {
  if (!is_plain_object(input)) return null
  const { method, path_template, params, query, body } = input
  if (typeof method !== 'string' || !METHODS.has(method) || typeof path_template !== 'string') return null
  if (params !== undefined && !(is_plain_object(params) && Object.values(params).every((value) => typeof value === 'string'))) return null
  if (query !== undefined && !is_plain_object(query)) return null
  return { method, path_template, params, query, body } as NodeRequest
}

export const register_ipc = ({ store, session, snapshots, is_app_frame }: {
  store: ConnectionStore
  session: NodeSession
  snapshots: SnapshotStore
  is_app_frame: (url: string) => boolean
}): void => {
  const handle = (channel: string, handler: (input: unknown) => Promise<unknown>): void => {
    ipcMain.handle(channel, async (event: IpcMainInvokeEvent, input: unknown) => {
      const url = event.senderFrame?.url
      if (url === undefined || !is_app_frame(url)) return refuse('IPC from an unknown frame.')
      return await handler(input)
    })
  }

  handle(IPC_CHANNELS.connection_get, async () => store.get())
  // Save is the teardown-and-reinitialize point (spec §8.3.5): the event
  // connection restarts, and a different node URL wipes the snapshot (§8.8.3).
  handle(IPC_CHANNELS.connection_save, async (input) => {
    const previous_url = store.get().node_url
    const saved = await store.save(input)
    if (!saved.ok) return saved
    if (saved.data.node_url !== previous_url) await snapshots.wipe()
    session.start(saved.data.node_url)
    return saved
  })
  handle(IPC_CHANNELS.connection_test, async (input) => {
    const checked = check_connection_config(input)
    if (!checked.ok) return checked
    return await test_connection({ node_url: checked.data.node_url as string })
  })
  handle(IPC_CHANNELS.request, async (input) => {
    const request = check_node_request(input)
    if (request === null) return refuse('Malformed node request.')
    return await request_node({ node_url: store.get().node_url, request })
  })
  const audio_downloads = create_audio_downloads({ download: async ({ cid, signal }) => await get_audio({ node_url: store.get().node_url, cid, signal }) })
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

  handle(IPC_CHANNELS.events_get_state, async () => session.get_state())
  handle(IPC_CHANNELS.events_reconnect_now, async () => { session.reconnect_now() })

  handle(IPC_CHANNELS.snapshot_load, async () => await snapshots.load(store.get().node_url))
  handle(IPC_CHANNELS.snapshot_update, async (input) => snapshots.update({ snapshot: input, node_url: store.get().node_url }))
  handle(IPC_CHANNELS.snapshot_get_info, async () => snapshots.get_info())
  handle(IPC_CHANNELS.snapshot_set_budget, async (input) => await snapshots.set_budget(input))
  handle(IPC_CHANNELS.snapshot_reset, async () => {
    await snapshots.wipe()
    return snapshots.get_info()
  })
}
