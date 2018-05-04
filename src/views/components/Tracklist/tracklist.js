import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getCurrentTracklist, getTracksForCurrentTracklist } from '@core/tracklists'
import LoadingIndicator from '@components/LoadingIndicator'
import Track from '@components/Track'

class Tracklist extends React.Component {
  render() {
    const { tracks } = this.props

    const trackItems = tracks.map((track, index) => {
      return (
	<div key={index}>
	  <Track track={track} />
	</div>
      )
    })

    return (
      <div>
	{trackItems}

	<div>
	  {(this.props.displayLoadingIndicator) ? <LoadingIndicator /> : null}
	</div>
      </div>
    )
  }
}

const mapStateToProps = createSelector(
  getCurrentTracklist,
  getTracksForCurrentTracklist,
  (tracklist, tracks) => ({
    displayLoadingIndicator: tracklist.isPending,
    tracks
  })
)

export default connect(mapStateToProps, null)(Tracklist)
