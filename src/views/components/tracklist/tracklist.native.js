import React from 'react'
import { View, Text } from 'react-native'

import Button from '@components/button'
import LoadingIndicator from '@components/loading-indicator'
import Track from '@components/track'
import loadingStyles from '@styles/loading'

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

  const loadStatus = () => {
    if (displayLoadingIndicator) {
      return <LoadingIndicator />
    }

    if (hasMore) {
      return (
        <Button
          onClick={loadNextTracks}
          style={loadingStyles.button}>
          <Text>Load More</Text>
        </Button>
      )
    }

    return null
  }

  return (
    <View>
      {trackItems}
      {loadStatus()}
    </View>
  )
}
