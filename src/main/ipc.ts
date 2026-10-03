// IPC handlers behind the preload bridge. Every argument from the renderer is
// untrusted and re-validated here (spec §8.10.3), and only the app's own
// window may call.

import { ipcMain, type IpcMainInvokeEvent } from 'electron'

import { API_ROUTES } from '#shared/api-routes.ts'
import { IPC_CHANNELS, type NodeRequest, type NodeResult } from '#shared/bridge.ts'
import { check_connection_config, type ConnectionStore } from './connection-store.ts'
import { get_audio, request_node, test_connection } from './node-client.ts'

const METHODS = new Set<string>(API_ROUTES.map(({ method }) => method))
const CID = /^[A-Za-z0-9]{1,128}$/

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

export const register_ipc = ({ store, is_app_frame }: {
  store: ConnectionStore
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
  handle(IPC_CHANNELS.connection_save, async (input) => await store.save(input))
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
  handle(IPC_CHANNELS.get_audio, async (input) => {
    const cid = is_plain_object(input) ? input.cid : undefined
    if (typeof cid !== 'string' || !CID.test(cid)) return refuse('Malformed audio CID.')
    return await get_audio({ node_url: store.get().node_url, cid })
  })
}
