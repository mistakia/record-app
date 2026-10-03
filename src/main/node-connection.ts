// Which node the app talks to: the saved remote URL in remote mode, or the
// bundled child once it answers its health check in bundled mode (spec
// §8.3). One node at a time (§8.3.6): a switch stops the bundled child when
// leaving bundled mode, starts it when entering, and moves the event session
// to the new URL. Imports nothing from Electron.

import type { ConnectionConfig, ConnectionView } from '#shared/bridge.ts'
import type { create_node_manager } from './bundled/node-manager.ts'
import { bundled_node_key, type NodePin } from './bundled/node-pin.ts'
import type { ConnectionStore } from './connection-store.ts'
import type { NodeSession } from './node-session.ts'

// Per-node state (the snapshot, the last export time) is keyed by node:
// the remote URL, or for the bundled node, whose port can change, its pinned
// peer_id and own library, so a reset data directory or an imported
// identity starts clean. Null until the bundled node has first answered.
export const node_key_of = ({ config, pin }: { config: ConnectionConfig, pin: NodePin | null }): string | null =>
  config.mode === 'bundled' ? bundled_node_key(pin) : config.node_url

export const create_node_connection = ({ store, manager, session, on_node_changed, on_view_changed = () => {} }: {
  store: ConnectionStore
  manager: Pick<ReturnType<typeof create_node_manager>, 'get_state' | 'start' | 'stop'>
  session: Pick<NodeSession, 'start'>
  // The node behind the URL changed: drop anything cached about the old one.
  on_node_changed: () => void
  // The view the renderer holds changed (a new node key): send it again.
  on_view_changed?: (view: ConnectionView) => void
}) => {
  let session_url: string | null | undefined
  let last_key: string | null | undefined

  const node_key = (): string | null => node_key_of({ config: store.get(), pin: manager.get_state().node_key_pin })
  const view = (): ConnectionView => ({ ...store.get(), node_key: node_key() })

  const node_url = (): string | null => store.get().mode === 'bundled' ? manager.get_state().url : store.get().node_url

  // Points the event session at the current URL; called whenever the mode,
  // the saved URL, or the bundled node's health changes.
  const sync = (): void => {
    const key = node_key()
    if (last_key !== undefined && key !== last_key) on_view_changed(view())
    last_key = key
    const url = node_url()
    if (url === session_url) return
    session_url = url
    session.start(url)
    on_node_changed()
  }

  const ensure_bundled_state = async (): Promise<void> => {
    const { mode } = store.get()
    const { status } = manager.get_state()
    if (mode === 'bundled' && (status === 'stopped' || status === 'failed')) await manager.start()
    if (mode === 'remote' && status !== 'stopped') await manager.stop()
  }

  return {
    node_url,
    node_key,
    view,
    sync,
    start: async (): Promise<void> => {
      sync()
      await ensure_bundled_state()
      sync()
    },
    // After a save: one node at a time, so the old target goes first.
    switched: async (): Promise<void> => {
      await ensure_bundled_state()
      sync()
    }
  }
}
