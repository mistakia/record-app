import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { ipfsActions, getId } from '@core/ipfs'
import Tracklist from '@components/tracklist'

export class HomePage extends React.Component {
  componentWillMount() {
    this.init()
  }

  init() {
    this.props.initIPFS()
  }

  render() {
    const { ipfsId } = this.props

    return (
      <section>
	<h5>IPFS ID: {ipfsId}</h5>
	<Tracklist />
      </section>
    )
  }
}

const mapStateToProps = createSelector(
  getId,
  ipfsId => ({ipfsId})
)

const mapDispatchToProps = {
  initIPFS: ipfsActions.init
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HomePage)
