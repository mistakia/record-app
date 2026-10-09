// The bundled node's network for each privacy (spec §8.3.5), apart from
// Electron so tests drive it under Bun.

import type { NetworkPrivacy } from '#shared/bridge.ts'
import type { BundledNetwork } from './node-manager.ts'
import type { TorManager } from './tor-manager.ts'

// The masked network starts Tor and hands its SOCKS address to the node; the
// public one stops Tor, so no Tor runs while it is not used (spec §8.2.6).
export const bundled_network = ({ privacy, tor }: { privacy: () => NetworkPrivacy, tor: TorManager | null }) => async (): Promise<BundledNetwork> => {
  if (privacy() === 'public') {
    await tor?.stop()
    return { privacy: 'public' }
  }
  if (tor === null) throw new Error('Masked networking needs the bundled Tor client, which this build does not include.')
  return { privacy: 'masked', config: { mode: 'masked', tor: { socks_address: await tor.ready() } } }
}
