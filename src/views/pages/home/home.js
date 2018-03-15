import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getOrbitId } from '@core/db'
import LoadDB from '@components/load-db'

export class HomePage extends React.Component {
  render() {
    const { orbitId } = this.props

    return (
      <section>
	<h5>ORBIT ID: {orbitId}</h5>
	<LoadDB />
      </section>
    )
  }
}

const mapStateToProps = createSelector(
  getOrbitId,
  (orbitId) => ({orbitId})
)

export default connect(
  mapStateToProps
)(HomePage)
