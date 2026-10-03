// The identity routes, owned by main (spec §8.5). Export returns the key
// pair only after the user confirms in a native dialog that main shows, so
// no renderer script can read the private key on its own (§8.10.1). Import
// goes only to the bundled node (§8.5.4). Imports nothing from Electron;
// ipc.ts supplies the dialog.

import type { ConnectionConfig, NodeResult } from '#shared/bridge.ts'
import { is_loopback_hostname } from '#shared/node-url.ts'
import { request_node } from './node-client.ts'

export interface IdentityKeys {
  public_key: string
  private_key: string
}

const refuse = (message: string): NodeResult<never> => ({ ok: false, failure: { kind: 'refused', message } })

// Plain http to another machine, where the private key crosses the network
// unencrypted.
export const is_cleartext_remote = (node_url: string): boolean => {
  const url = new URL(node_url)
  return url.protocol === 'http:' && !is_loopback_hostname(url.hostname)
}

const read_keys = async ({ node_url, call }: { node_url: string, call: typeof request_node }): Promise<NodeResult<IdentityKeys>> => {
  const result = await call({ node_url, request: { method: 'get', path_template: '/identity/export' } })
  if (!result.ok) return result
  const { public_key, private_key } = (result.data ?? {}) as { public_key?: unknown, private_key?: unknown }
  if (typeof public_key !== 'string' || typeof private_key !== 'string') return refuse('The node returned no identity.')
  return { ok: true, data: { public_key, private_key } }
}

const not_configured: NodeResult<never> = { ok: false, failure: { kind: 'not_configured', message: 'No node URL is configured.' } }

export const create_identity_access = ({ get_connection, confirm_export, call = request_node }: {
  get_connection: () => ConnectionConfig
  // Asks the user, outside the renderer, whether to reveal the key.
  confirm_export: (input: { node_url: string, cleartext: boolean }) => Promise<boolean>
  call?: typeof request_node
}) => {
  // Public keys by node URL, so the private key crosses into main at most
  // once per node just to show the public one. Only the public half is kept.
  const public_keys = new Map<string, string>()

  return {
    // Chapter 7 serves the public key only with the private key, so reading
    // it moves the private key too; over plain http to another machine that
    // is refused until a public-key read exists (record-docs v1.1.0).
    public_key: async (): Promise<NodeResult<{ public_key: string }>> => {
      const { node_url } = get_connection()
      if (node_url === null) return not_configured
      const known = public_keys.get(node_url)
      if (known !== undefined) return { ok: true, data: { public_key: known } }
      if (is_cleartext_remote(node_url)) {
        return refuse('Showing the public key would fetch the private key with it over unencrypted http. Use https, or wait for a public-key read in a later node version.')
      }
      const keys = await read_keys({ node_url, call })
      if (!keys.ok) return keys
      public_keys.set(node_url, keys.data.public_key)
      return { ok: true, data: { public_key: keys.data.public_key } }
    },
    export_identity: async (): Promise<NodeResult<IdentityKeys>> => {
      const { node_url } = get_connection()
      if (node_url === null) return not_configured
      if (!await confirm_export({ node_url, cleartext: is_cleartext_remote(node_url) })) return { ok: false, failure: { kind: 'aborted', message: 'Export cancelled.' } }
      const keys = await read_keys({ node_url, call })
      if (keys.ok) public_keys.set(node_url, keys.data.public_key)
      return keys
    },
    import_identity: async (input: unknown): Promise<NodeResult<unknown>> => {
      const { mode, node_url } = get_connection()
      if (mode !== 'bundled') return refuse('Identity import is only available for the bundled node.')
      const private_key = typeof input === 'object' && input !== null ? (input as { private_key?: unknown }).private_key : undefined
      if (typeof private_key !== 'string' || !/^[0-9a-f]+$/i.test(private_key)) return refuse('The key must be the hex text an export produced.')
      const result = await call({ node_url, request: { method: 'post', path_template: '/identity/import', body: { private_key } } })
      if (result.ok && node_url !== null) public_keys.delete(node_url)
      return result
    },
    // A saved connection may point at another node, or the same URL at a
    // node with another identity.
    forget: (): void => { public_keys.clear() }
  }
}
