import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getOrbitId, dbActions } from '@core/db'
import LoadDB from '@components/load-db'

export class HomePage extends React.Component {
  componentWillMount() {
    this.props.init()
  }

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

const mapDispatchToProps = {
  init: dbActions.init
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HomePage)
