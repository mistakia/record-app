// Requests main refuses whatever the renderer asks, beyond the route
// allowlist. Imports nothing from Electron.

import type { ConnectionMode, NodeRequest } from '#shared/bridge.ts'

// Spec §8.5.4: identity import replaces a node's identity, so it is only
// sent to the bundled node this app runs, never to a remote one.
export const refused_by_policy = ({ request, mode }: { request: Pick<NodeRequest, 'method' | 'path_template'>, mode: ConnectionMode }): string | null =>
  request.method === 'post' && request.path_template === '/identity/import' && mode !== 'bundled'
    ? 'Identity import is only available for the bundled node.'
    : null
