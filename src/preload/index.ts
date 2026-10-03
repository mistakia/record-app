// The renderer's only door to the main process (spec §8.10.3): named
// functions over fixed IPC channels, never ipcRenderer itself. Arguments are
// shape-checked here and again in main.

import { contextBridge, ipcRenderer } from 'electron'

import { IPC_CHANNELS, type ConnectionConfig, type NodeRequest, type RecordBridge } from '#shared/bridge.ts'

const require_object = (value: unknown, name: string): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${name} must be an object`)
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
  get_audio: async ({ cid }: { cid: string }) => {
    if (typeof cid !== 'string') throw new TypeError('cid must be a string')
    return await ipcRenderer.invoke(IPC_CHANNELS.get_audio, { cid })
  }
}

contextBridge.exposeInMainWorld('record', bridge)
