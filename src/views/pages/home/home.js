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
        <div key={index}>
          <p>{id}</p>
          <p>Sub Peers: {subPeers.length}</p>
          <p>{subPeers}</p>
        </div>
      )
    })

    const peers = info.peers.map((peer, index) => {
      return (
        <div key={index}>
          <p>{peer.id}</p>
          <p>{peer.address}</p>
        </div>
      )
    })

    const body = (
      <div>
        <h5>ID: {info.ipfs.id}</h5>
        <p>{info.ipfs.publicKey}</p>
        <p>{info.ipfs.agentVersion}</p>
        <p>{info.ipfs.protocolVersion}</p>
        <p>Subs: {subs.length}</p>
        <div>{subs}</div>
        <p>Peers: {peers.length}</p>
        <div>{peers}</div>
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
