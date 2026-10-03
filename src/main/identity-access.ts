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

export const create_identity_access = ({ get_connection, confirm_export, call = request_node }: {
  get_connection: () => ConnectionConfig
  // Asks the user, outside the renderer, whether to reveal the key.
  confirm_export: (input: { node_url: string, cleartext: boolean }) => Promise<boolean>
  call?: typeof request_node
}) => ({
  export_identity: async (): Promise<NodeResult<IdentityKeys>> => {
    const { node_url } = get_connection()
    if (node_url === null) return { ok: false, failure: { kind: 'not_configured', message: 'No node URL is configured.' } }
    if (!await confirm_export({ node_url, cleartext: is_cleartext_remote(node_url) })) return { ok: false, failure: { kind: 'aborted', message: 'Export cancelled.' } }
    return await read_keys({ node_url, call })
  },
  import_identity: async (input: unknown): Promise<NodeResult<unknown>> => {
    const { mode, node_url } = get_connection()
    if (mode !== 'bundled') return refuse('Identity import is only available for the bundled node.')
    const private_key = typeof input === 'object' && input !== null ? (input as { private_key?: unknown }).private_key : undefined
    if (typeof private_key !== 'string' || !/^[0-9a-f]+$/i.test(private_key)) return refuse('The key must be the hex text an export produced.')
    return await call({ node_url, request: { method: 'post', path_template: '/identity/import', body: { private_key } } })
  }
})
