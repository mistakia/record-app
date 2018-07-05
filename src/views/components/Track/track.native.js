import React from 'react'
import { View, Text } from 'react-native'

import IconButton from '@components/icon-button'

class Track extends React.Component {
  render () {
    const { isPlaying, isSelected, pause, play, track } = this.props

    return (
      <View>
        <Text>{track.title}</Text>
        <IconButton
          icon={isPlaying ? 'ios-pause' : 'ios-play'}
          onClick={isPlaying ? pause : play}
        />
      </View>
    )
  }
}

export default Track
