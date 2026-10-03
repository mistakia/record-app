// The renderer's only door to the main process (spec §8.10.3): named
// functions over fixed IPC channels, never ipcRenderer itself. Arguments are
// shape-checked here and again in main.

import { contextBridge, ipcRenderer } from 'electron'

import { IPC_CHANNELS, type ConnectionConfig, type EventsState, type NodeEventMessage, type NodeRequest, type RecordBridge } from '#shared/bridge.ts'
import type { HibernationSnapshot } from '#shared/snapshot.ts'

const require_object = (value: unknown, name: string): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${name} must be an object`)
}

// Subscribes to one main-to-renderer channel, handing the listener only the
// payload, never the IPC event.
const subscribe = <T>(channel: string, listener: (payload: T) => void): () => void => {
  if (typeof listener !== 'function') throw new TypeError('listener must be a function')
  const forward = (_event: unknown, payload: T): void => { listener(payload) }
  ipcRenderer.on(channel, forward)
  return () => { ipcRenderer.removeListener(channel, forward) }
}

const bridge: RecordBridge = {
  connection: {
    get: async () => await ipcRenderer.invoke(IPC_CHANNELS.connection_get),
    save: async (config: ConnectionConfig) => {
      require_object(config, 'config')
      return await ipcRenderer.invoke(IPC_CHANNELS.connection_save, { mode: config.mode, node_url: config.node_url })
    },
    test: async (config: ConnectionConfig) => {
      require_object(config, 'config')
      return await ipcRenderer.invoke(IPC_CHANNELS.connection_test, { mode: config.mode, node_url: config.node_url })
    }
  },
  request: async (request: NodeRequest) => {
    require_object(request, 'request')
    const { method, path_template, params, query, body } = request
    return await ipcRenderer.invoke(IPC_CHANNELS.request, { method, path_template, params, query, body })
  },
  get_audio: async ({ cid, request_id }: { cid: string, request_id: string }) => {
    if (typeof cid !== 'string') throw new TypeError('cid must be a string')
    if (typeof request_id !== 'string') throw new TypeError('request_id must be a string')
    return await ipcRenderer.invoke(IPC_CHANNELS.get_audio, { cid, request_id })
  },
  cancel_audio: async ({ request_id }: { request_id: string }) => {
    if (typeof request_id !== 'string') throw new TypeError('request_id must be a string')
    await ipcRenderer.invoke(IPC_CHANNELS.cancel_audio, { request_id })
  },
  events: {
    get_state: async () => await ipcRenderer.invoke(IPC_CHANNELS.events_get_state),
    reconnect_now: async () => { await ipcRenderer.invoke(IPC_CHANNELS.events_reconnect_now) },
    on_event: (listener: (message: NodeEventMessage) => void) => subscribe(IPC_CHANNELS.events_message, listener),
    on_state: (listener: (state: EventsState) => void) => subscribe(IPC_CHANNELS.events_state, listener)
  },
  import: {
    choose_files: async () => await ipcRenderer.invoke(IPC_CHANNELS.import_choose_files),
    upload_files: async (files: Array<{ name: string, data: ArrayBuffer }>) => {
      if (!Array.isArray(files)) throw new TypeError('files must be an array')
      return await ipcRenderer.invoke(IPC_CHANNELS.import_upload_files, files.map(({ name, data }) => ({ name, data })))
    }
  },
  identity: {
    export: async () => await ipcRenderer.invoke(IPC_CHANNELS.identity_export),
    import: async ({ private_key }: { private_key: string }) => {
      if (typeof private_key !== 'string') throw new TypeError('private_key must be a string')
      return await ipcRenderer.invoke(IPC_CHANNELS.identity_import, { private_key })
    },
    public_key: async () => await ipcRenderer.invoke(IPC_CHANNELS.identity_public_key)
  },
  snapshot: {
    load: async () => await ipcRenderer.invoke(IPC_CHANNELS.snapshot_load),
    update: async (snapshot: HibernationSnapshot) => {
      require_object(snapshot, 'snapshot')
      return await ipcRenderer.invoke(IPC_CHANNELS.snapshot_update, snapshot)
    },
    get_info: async () => await ipcRenderer.invoke(IPC_CHANNELS.snapshot_get_info),
    set_budget: async ({ budget_bytes }: { budget_bytes: number }) => {
      if (typeof budget_bytes !== 'number') throw new TypeError('budget_bytes must be a number')
      return await ipcRenderer.invoke(IPC_CHANNELS.snapshot_set_budget, { budget_bytes })
    },
    reset: async () => await ipcRenderer.invoke(IPC_CHANNELS.snapshot_reset)
  }
}

contextBridge.exposeInMainWorld('record', bridge)
