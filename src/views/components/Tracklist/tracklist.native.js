import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { View } from 'react-native'

import { getCurrentTracklist, getTracksForCurrentTracklist } from '@core/tracklists'
import LoadingIndicator from '@components/LoadingIndicator'
import Track from '@components/Track'

class Tracklist extends React.Component {
  render () {
    const { tracks } = this.props

    const trackItems = tracks.map((track, index) => {
      return (
        <View key={index}>
          <Track track={track} />
        </View>
      )
    })

    return (
      <View>
        {trackItems}

        <View>
          {(this.props.displayLoadingIndicator) ? <LoadingIndicator /> : null}
        </View>
      </View>
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
