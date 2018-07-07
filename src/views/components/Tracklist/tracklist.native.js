import React from 'react'
import { View } from 'react-native'

import LoadingIndicator from '@components/LoadingIndicator'
import Track from '@components/Track'

export default function Tracklist ({ tracks, displayLoadingIndicator }) {
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
        {(displayLoadingIndicator) ? <LoadingIndicator /> : null}
      </View>
    </View>
  )
}
