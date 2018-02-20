import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getCurrentTracklist, tracklistActions } from '@core/tracklist'
import TrackCard from '@components/track-card'

export class Tracklist extends React.Component {
  componentWillMount() {
    this.loadTracks()
  }

  loadTracks() {
    this.props.loadTracks()
  }

  render() {
    const { tracks } = this.props

    const trackCards = tracks.map((track, index) => {
      return (
	<div key={index}>
	  <TrackCard track={track} />
	</div>
      )
    })
    
    return (
      <div>
	{trackCards}
      </div>
    )
  }
}

const mapStateToProps = createSelector(
  getCurrentTracklist,
  tracks => ({tracks})
)

const mapDispatchToProps = {
  loadTracks: tracklistActions.loadTracks
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Tracklist)
