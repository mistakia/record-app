// Peers (GET /peers): the libp2p peers the node is connected to, and the
// libraries each advertises; peer IDs sit behind a disclosure.

import styles from './peers-section.module.css'
import { ShowStrip } from '#renderer/components/common/show-strip.tsx'
import type { Peer } from '#renderer/api/types.ts'

export const PeersSection = ({ peers, error }: { peers: Peer[] | undefined, error: string | null }) => {
  if (error !== null) return <p className={styles.error}>{error}</p>
  if (peers === undefined) return null
  if (peers.length === 0) return <p className={styles.muted}>The node is not connected to any peers.</p>
  return (
    <>
      <table className={styles.table}>
        <thead><tr><th>Connected since</th><th>Libraries</th><th>Addresses</th></tr></thead>
        <tbody>
          {peers.map((peer) => (
            <tr key={peer.peer_id} data-testid='peer-row'>
              <td>{peer.connected_at_ms === undefined ? '' : new Date(peer.connected_at_ms).toLocaleString()}</td>
              <td className='tabular'>{peer.library_addresses?.length ?? 0}</td>
              <td className='tabular'>{peer.multiaddrs.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ShowStrip label='peer ids'>
        <ul className={styles.ids}>{peers.map(({ peer_id }) => <li key={peer_id}><code>{peer_id}</code></li>)}</ul>
      </ShowStrip>
    </>
  )
}
