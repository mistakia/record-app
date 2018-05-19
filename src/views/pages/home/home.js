import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getOrbitId } from '@core/db'
import PageLayout from '@layouts/page'

export class HomePage extends React.Component {
  render() {
    const { orbitId } = this.props

    const head = (
      <h1>Home Page</h1>
    )

    const body = (
      <h5>ORBIT ID: {orbitId}</h5>
    )

    return (
      <PageLayout head={head} body={body} />
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
