import React from 'react'
import { View } from 'react-native'

import { getCurrentTracklist, getTracksForCurrentTracklist } from '@core/tracklists'
import { getPlayerIsPlaying, getPlayerTrackId, playerActions } from '@core/player'
import { audio } from '@core/audio'
import LoadingIndicator from '@components/LoadingIndicator'
import Track from '@components/Track'

class Tracklist extends React.Component {
  render () {
    const {
      isPlaying,
      pause,
      play,
      selectedTrackId,
      selectTrack,
      tracklistId,
      tracks
    } = this.props

    const trackItems = tracks.map((track, index) => {
      const isSelected = track.id === selectedTrackId
      return (
        <View key={index}>
          <Track
            track={track}
            isPlaying={isSelected && isPlaying}
            isSelected={isSelected}
            pause={pause}
            play={isSelected ? play : selectTrack.bind(null, track.id, tracklistId)}
          />
        </View>
      )
    })
  }
}

const mapStateToProps = createSelector(
  getPlayerIsPlaying,
  getPlayerTrackId,
  getCurrentTracklist,
  getTracksForCurrentTracklist,
  (isPlaying, playerTrackId, tracklist, tracks) => ({
    displayLoadingIndicator: tracklist.isPending,
    isPlaying,
    pause: audio.pause,
    play: audio.play,
    selectedTrackId: playerTrackId,
    tracklistId: tracklist.id,
    tracks
  })

const mapDispatchToProps = {
  selectTrack: playerActions.playSelectedTrack
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Tracklist)
