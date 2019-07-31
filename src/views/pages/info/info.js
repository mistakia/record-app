import React from 'react'

import PageLayout from '@layouts/page'
import CopyText from '@components/copy-text'

import './info.styl'

export default function () {
  const { app, info } = this.props

  const peers = info.peers.map((peer, index) => {
    return (
      <tr key={index}>
        <td>{index + 1}</td>
        <td>{peer.address}</td>
      </tr>
    )
  })

  const body = (
    <div id='info-container'>
      <div>
        <CopyText text={app.orbitdb.address}>
          <label>Address</label>
          <pre>{app.orbitdb.address}</pre>
        </CopyText>
        <CopyText text={app.orbitdb.publicKey}>
          <label>Public Key</label>
          <pre>{app.orbitdb.publicKey}</pre>
        </CopyText>
        <CopyText text={app.ipfs.id}>
          <label>PeerID</label>
          <pre>{app.ipfs.id}</pre>
        </CopyText>
      </div>
      <div>
        <table>
          <tbody>
            <tr>
              <th><label>IPFS State</label></th>
              <td>{info.state}</td>
            </tr>
            <tr>
              <th><label>OrbitDB State</label></th>
              <td>{app.isReplicating ? 'Replicating' : 'Offline'}</td>
            </tr>
            <tr>
              <th><label>IPFS Agent Version</label></th>
              <td>{app.ipfs.agentVersion}</td>
            </tr>
            <tr>
              <th><label>IPFS Protocol Version</label></th>
              <td>{app.ipfs.protocolVersion}</td>
            </tr>
            <tr>
              <th><label>Data Sent</label></th>
              <td>{info.bitswap.dataSent}</td>
            </tr>
            <tr>
              <th><label>Data Received</label></th>
              <td>{info.bitswap.dataReceived}</td>
            </tr>
            <tr>
              <th><label>Repo Objects</label></th>
              <td>{info.repo.numObjects}</td>
            </tr>
            <tr>
              <th><label>Repo Size</label></th>
              <td>{parseFloat(info.repo.repoSize).toFixed(2)} Mb</td>
            </tr>
            <tr>
              <th><label>Repo Version</label></th>
              <td>{info.repo.version}</td>
            </tr>
          </tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th />
              <th>IPFS Peer</th>
            </tr>
          </thead>
          <tbody>
            {peers}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <PageLayout title='Info' body={body} />
  )
}
