import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getOrbitId } from '@core/db'

export class HomePage extends React.Component {
  render() {
    const { orbitId } = this.props

    return (
      <section>
	<h1>Home Page</h1>	
	<h5>ORBIT ID: {orbitId}</h5>
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
