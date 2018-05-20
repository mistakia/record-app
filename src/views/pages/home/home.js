import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getInfo } from '@core/info'
import PageLayout from '@layouts/page'

export class HomePage extends React.Component {
  render () {
    const { info } = this.props

    const head = (
      <h1>Home</h1>
    )

    const subs = Object.keys(info.subs).map((id, index) => {
      const subPeers = info.subs[id]
      return (
        <tr key={index}>
          <td>{id}</td>
          <td>{subPeers.length}</td>
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
        <label>Orbit DB Address</label>
        <pre>{info.orbitdb.address}</pre>
        <label>Orbit DB Public Key</label>
        <pre>{info.orbitdb.publicKey}</pre>
        <label>IPFS ID</label>
        <pre>{info.ipfs.id}</pre>
        <label>IPFS Public Key</label>
        <pre>{info.ipfs.publicKey}</pre>
        <label>IPFS Agent Version</label>
        <pre>{info.ipfs.agentVersion}</pre>
        <label>IPFS Protocol Version</label>
        <pre>{info.ipfs.protocolVersion}</pre>
        <table>
          <thead>
            <tr>
              <th>Sub</th>
              <th>Peers</th>
            </tr>
          </thead>
          <tbody>
            {subs}
          </tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th>#</th>
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
      <PageLayout head={head} body={body} />
    )
  }
}

const mapStateToProps = createSelector(
  getInfo,
  (info) => ({info})
)

export default connect(
  mapStateToProps
)(HomePage)
