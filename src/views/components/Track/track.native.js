import React from 'react'
import {
  Image,
  View,
  StyleSheet,
  Text,
  TouchableOpacity
} from 'react-native'

import IconButton from '@components/icon-button'

class Track extends React.Component {
  render () {
    const { isPlaying, isSelected, pause, play, track } = this.props

    return (
      <TouchableOpacity
        style={styles.track}
        onPress={isPlaying ? pause : play}>
        <Image
          style={styles.thumbnail}
          source={{uri: track.thumbnail}}/>
        <View style={styles.title}>
          <Text>{track.title}</Text>
        </View>
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    minHeight:60,
    flexDirection: 'row'
  },
  thumbnail: {
    margin: 4,
    flex: 1
  },
  title: {
    flex: 5,
    margin: 4,
    borderBottomWidth: 1,
    borderStyle: 'solid',
    borderColor: '#f0f0f0'
  }
})

export default Track
