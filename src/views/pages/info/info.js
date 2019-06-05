import React from 'react'

import PageLayout from '@layouts/page'
import CopyText from '@components/copy-text'

export default function () {
  const { info } = this.props

  console.log(info)

  const subs = Object.keys(info.subs).map((id, index) => {
    const subPeers = info.subs[id]
    return (
      <tr key={index}>
        <td>{subPeers.length}</td>
        <td>{id}</td>
      </tr>
    )
  })

  const peers = info.peers.map((peer, index) => {
    return (
      <tr key={index}>
        <td>{index + 1}</td>
        <td>{peer.address}</td>
      </tr>
    )
  })

  const body = (
    <div>
      <label>State</label>
      <pre>{info.state}</pre>
      <CopyText text={info.orbitdb.address}>
        <label>Orbit DB Address</label>
        <pre>{info.orbitdb.address}</pre>
      </CopyText>
      <CopyText text={info.orbitdb.publicKey}>
        <label>Orbit DB Public Key</label>
        <pre>{info.orbitdb.publicKey}</pre>
      </CopyText>
      <CopyText text={info.ipfs.id}>
        <label>IPFS ID</label>
        <pre>{info.ipfs.id}</pre>
      </CopyText>
      <CopyText text={info.ipfs.publicKey}>
        <label>IPFS Public Key</label>
        <pre>{info.ipfs.publicKey}</pre>
      </CopyText>
      <table>
        <tbody>
          <tr>
            <th><label>IPFS Agent Version</label></th>
            <td>{info.ipfs.agentVersion}</td>
          </tr>
          <tr>
            <th><label>IPFS Protocol Version</label></th>
            <td>{info.ipfs.protocolVersion}</td>
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
            <th># Peers</th>
            <th>PubSub Topic</th>
          </tr>
        </thead>
        <tbody>
          {subs}
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
  )

  return (
    <PageLayout title='Info' body={body} />
  )
}
