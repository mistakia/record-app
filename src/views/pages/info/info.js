import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getInfo, infoActions } from '@core/info'
import PageLayout from '@layouts/page'
import CopyText from '@components/CopyText'

export class InfoPage extends React.Component {
  componentWillMount () {
    this.props.init()
  }

  render () {
    const { info } = this.props

    const head = (
      <h1>Info</h1>
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

const mapDispatchToProps = {
  init: infoActions.init
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InfoPage)
