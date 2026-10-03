// Every call main makes to the node goes through here (spec §8.7.3): with
// the remote node's token, never while the node has refused it, and a 401
// rejects the credentials the call was sent with. Imports nothing from
// Electron.

import type { NodeResult } from '#shared/bridge.ts'
import type { NodeTarget, SentCredentials } from './node-session.ts'

export const NEEDS_TOKEN: NodeResult<never> = {
  ok: false,
  failure: { kind: 'auth', status: 401, message: 'The node needs a valid access token. Enter one in Connection settings.' }
}

export const create_authed_call = ({ target, unauthorized }: {
  target: () => NodeTarget | null
  unauthorized: (sent: SentCredentials) => void
}) => async <T>(run: (target: { node_url: string | null, token: string | null }) => Promise<NodeResult<T>>): Promise<NodeResult<T>> => {
  const current = target()
  if (current?.blocked === true) return NEEDS_TOKEN
  const result = await run({ node_url: current?.node_url ?? null, token: current?.token ?? null })
  if (!result.ok && result.failure.kind === 'auth' && current !== null) {
    unauthorized({ node_url: current.node_url, token: current.token, generation: current.generation })
  }
  return result
}
