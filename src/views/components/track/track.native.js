import React from 'react'
import {
  Image,
  View,
  StyleSheet,
  Text,
  TouchableOpacity
} from 'react-native'

import Tags from '@components/tags'

class Track extends React.Component {
  render () {
    const { isPlaying, isSelected, pause, play, track } = this.props

    return (
      <TouchableOpacity
        style={styles.track}
        onPress={isPlaying ? pause : play}>
        <Image
          style={styles.thumbnail}
          source={{uri: track.thumbnail}} />
        <View style={styles.body}>
          <View style={styles.title}>
            <Text>{track.title}</Text>
          </View>
          <Tags track={track.toJS()} />
        </View>
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 8
  },
  track: {
    minHeight: 60,
    flexDirection: 'row'
  },
  thumbnail: {
    margin: 4,
    maxHeight: 60,
    flex: 1
  },
  body: {
    flex: 5,
    margin: 4
  }
})

export default Track
