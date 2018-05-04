import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getOrbitId } from '@core/db'
import { tracklistActions } from '@core/tracklists'
import Tracklist from '@components/Tracklist'

export class TracksPage extends React.Component {
  componentWillMount() {
    this.props.loadTracks('me')
  }

  render() {
    const { orbitId } = this.props

    return (
      <section>
	<h5>ORBIT ID: {orbitId}</h5>
	<Tracklist />

      </section>
    )
  }
}

const mapStateToProps = createSelector(
  getOrbitId,
  (orbitId) => ({orbitId})
)

const mapDispatchToProps = {
  loadTracks: tracklistActions.loadTracks
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TracksPage)
