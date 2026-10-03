// Peers (GET /peers): the libp2p peers the node is connected to, and the
// libraries each advertises.

import styles from './listens.module.css'
import { node_api } from '#renderer/store/api.ts'

export const Peers = () => {
  const peers = node_api.endpoints.get_peers.useQuery()
  const items = peers.data ?? []
  return (
    <section className={styles.page}>
      <div className={styles.toolbar}><h1>Peers</h1><span>{items.length} connected</span></div>
      {peers.error !== undefined && <p className={styles.error}>{'message' in peers.error ? peers.error.message : 'The node request failed.'}</p>}
      {peers.isSuccess && items.length === 0 && <p className={styles.muted}>The node is not connected to any peers.</p>}
      <table className={styles.table}>
        <thead><tr><th>Peer</th><th>Addresses</th><th>Libraries</th><th>Connected since</th></tr></thead>
        <tbody>
          {items.map((peer) => (
            <tr key={peer.peer_id} data-testid='peer-row'>
              <td>{peer.peer_id}</td>
              <td>{peer.multiaddrs.length}</td>
              <td>{peer.library_addresses?.length ?? 0}</td>
              <td>{peer.connected_at_ms === undefined ? '' : new Date(peer.connected_at_ms).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
