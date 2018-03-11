import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getOrbitId, dbActions } from '@core/db'

export class HomePage extends React.Component {
  componentWillMount() {
    this.props.init()
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
  (orbitId) => ({orbitId})
)

const mapDispatchToProps = {
  init: dbActions.init
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HomePage)
