import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { ipfsActions, getIPFSId } from '@core/ipfs'
import { getOrbitId } from '@core/db'

export class HomePage extends React.Component {
  componentWillMount() {
    this.init()
  }

  init() {
    this.props.initIPFS()
  }

  render() {
    const { ipfsId, orbitId } = this.props

    return (
      <section>
	<h5>IPFS ID: {ipfsId}</h5>
	<h5>ORBIT ID: {orbitId}</h5>
      </section>
    )
  }
}

const mapStateToProps = createSelector(
  getOrbitId,
  getIPFSId,
  (orbitId, ipfsId) => ({orbitId,ipfsId})
)

const mapDispatchToProps = {
  initIPFS: ipfsActions.init
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HomePage)
