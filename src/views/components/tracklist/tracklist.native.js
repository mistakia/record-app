import React from 'react'
import { View, Text } from 'react-native'

import Button from '@components/button'
import LoadingIndicator from '@components/loading-indicator'
import Track from '@components/track'

export default function Tracklist ({
  displayLoadingIndicator,
  hasMore,
  isPlaying,
  loadNextTracks,
  pause,
  play,
  selectedTrackId,
  selectTrack,
  tracklistId,
  tracks
}) {
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

  const buttonStyle = {
    marginTop: 30,
    marginBottom: 20,
    marginLeft: 15,
    marginRight: 15
  }
  const loadStatus = displayLoadingIndicator ?
                     <LoadingIndicator /> :
                     ( hasMore ?
                       (<Button
                          onClick={loadNextTracks}
                          style={buttonStyle}>
                         <Text>Load More</Text>
                       </Button>) :
                       null)
  return (
    <View>
      {trackItems}
      {loadStatus}
    </View>
  )
}
