// Which node the app talks to: the saved remote URL in remote mode, or the
// bundled child once it answers its health check in bundled mode (spec
// §8.3). One node at a time (§8.3.6): a switch stops the bundled child when
// leaving bundled mode, starts it when entering, and moves the event session
// to the new URL. Imports nothing from Electron.

import type { ConnectionConfig, ConnectionView } from '#shared/bridge.ts'
import type { create_node_manager } from './bundled/node-manager.ts'
import { bundled_node_key, type NodePin } from './bundled/node-pin.ts'
import type { ConnectionStore } from './connection-store.ts'
import type { NodeAuth } from './node-auth.ts'
import type { NodeSession, NodeTarget } from './node-session.ts'

// Per-node state (the snapshot, the last export time) is keyed by node:
// the remote URL, or for the bundled node, whose port can change, its pinned
// peer_id and own library, so a reset data directory or an imported
// identity starts clean. Null until the bundled node has first answered.
export const node_key_of = ({ config, pin }: { config: ConnectionConfig, pin: NodePin | null }): string | null =>
  config.mode === 'bundled' ? bundled_node_key(pin) : config.node_url

export const create_node_connection = ({ store, auth, manager, session, on_node_changed, on_view_changed = () => {} }: {
  store: ConnectionStore
  auth: NodeAuth
  manager: Pick<ReturnType<typeof create_node_manager>, 'get_state' | 'start' | 'stop'>
  session: Pick<NodeSession, 'start'>
  // The node behind the URL changed: drop anything cached about the old one.
  on_node_changed: () => void
  // The view the renderer holds changed (a new node key): send it again.
  on_view_changed?: (view: ConnectionView) => void
}) => {
  let session_url: string | null | undefined
  let session_auth: string | undefined
  // Bumped whenever the remote token is saved, deleted, or refused.
  let auth_generation = 0
  let last_key: string | null | undefined

  const node_key = (): string | null => node_key_of({ config: store.get(), pin: manager.get_state().node_key_pin })
  const remote_url = (): string | null => store.get().mode === 'remote' ? store.get().node_url : null
  const view = (): ConnectionView => ({ ...store.get(), node_key: node_key(), auth: auth.view(remote_url()) })

  const node_url = (): string | null => store.get().mode === 'bundled' ? manager.get_state().url : store.get().node_url

  // The node with the credentials to send it: none for the bundled node
  // (spec §8.7.3), the saved token for a remote one.
  const target = (): NodeTarget | null => {
    const url = node_url()
    if (url === null) return null
    if (store.get().mode === 'bundled') return { node_url: url, token: null, blocked: false }
    return { node_url: url, token: auth.token(url), blocked: auth.blocked(url) }
  }

  // Points the event session at the current target; called whenever the
  // mode, the saved URL, the token, or the bundled node's health changes.
  const sync = (): void => {
    const key = node_key()
    if (last_key !== undefined && key !== last_key) on_view_changed(view())
    last_key = key
    const current = target()
    const url = current?.node_url ?? null
    // Only whether the token changed, never the token, is kept here.
    const auth_state = current === null ? '' : `${current.blocked ? 'blocked' : 'open'}:${auth_generation}`
    if (url === session_url && auth_state === session_auth) return
    const node_changed = url !== session_url
    session_url = url
    session_auth = auth_state
    session.start(current)
    if (node_changed) on_node_changed()
  }
  const auth_changed = (): void => {
    auth_generation++
    sync()
  }

  const load_auth = async (): Promise<void> => {
    const url = remote_url()
    if (url !== null) await auth.load(url)
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
    target,
    view,
    sync,
    start: async (): Promise<void> => {
      await load_auth()
      sync()
      await ensure_bundled_state()
      sync()
    },
    // After a save: one node at a time, so the old target goes first. A
    // token entered with the save is stored first, so the new connection
    // carries it from its first request; a save always reconnects.
    switched: async ({ token }: { token?: string | undefined } = {}): Promise<void> => {
      const url = remote_url()
      if (token !== undefined && url !== null) await auth.save(url, token)
      await load_auth()
      await ensure_bundled_state()
      auth_changed()
    },
    logout: async (): Promise<void> => {
      const url = remote_url()
      if (url === null) return
      await auth.logout(url)
      auth_changed()
    },
    // A request answered 401 (spec §8.7.3): forget the token it carried and
    // send nothing more until the user enters a new one. A 401 from a node
    // that is no longer the target, or for a token since replaced, is moot.
    unauthorized: async ({ node_url: url, token }: { node_url: string, token: string | null }): Promise<void> => {
      if (url !== remote_url()) return
      if (!await auth.reject(url, token)) return
      auth_changed()
      on_view_changed(view())
    }
  }
}
