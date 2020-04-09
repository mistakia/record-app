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
    const { isPlaying, isSelected, isFeed, pause, play, track } = this.props

    const trackStyles = isFeed ? [styles.track, styles.feed] : [styles.track]

    if (!track) {
      return null
    }

    return (
      <TouchableOpacity
        style={trackStyles}
        onPress={isPlaying ? pause : play}>
        <View style={styles.thumbnailContainer}>
          <Image
            style={styles.thumbnail}
            source={{uri: track.thumbnail}} />
        </View>
        <View style={styles.body}>
          <View style={styles.title}>
            <Text>{track.title}</Text>
          </View>
          <Tags track={track} />
        </View>
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  title: {
    padding: 4
  },
  feed: {
    borderRightWidth: 1,
    marginLeft: 15,
    marginRight: 10
  },
  track: {
    minHeight: 60,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: -1,
    marginLeft: 5,
    marginRight: 5,
    borderColor: '#f0f0f0',
    borderRadius: 2
  },
  thumbnailContainer: {
    padding: 4,
    backgroundColor: '#f0f0f0',
    maxHeight: 58
  },
  thumbnail: {
    width: 50,
    height: 50
  },
  body: {
    flex: 5
  }
})

export default Track
