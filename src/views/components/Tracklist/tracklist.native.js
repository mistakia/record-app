import React from 'react'
import { View } from 'react-native'

import LoadingIndicator from '@components/LoadingIndicator'
import Track from '@components/Track'

export default function Tracklist ({
  displayLoadingIndicator,
  isPlaying,
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

  return (
    <View>
      {trackItems}

      <View>
        {(displayLoadingIndicator) ? <LoadingIndicator /> : null}
      </View>
    </View>
  )
}
