import React from 'react'
import { connect } from 'react-redux'
import {
  Image,
  View,
  StyleSheet,
  Text,
  TouchableOpacity
} from 'react-native'

import { modalActions } from '@core/modal'
import IconButton from '@components/icon-button'
import Tags from '@components/tags'

class Track extends React.Component {
  render () {
    const { isPlaying, isSelected, pause, play, track, showTrackModal } = this.props

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
        <IconButton
          style={styles.more}
          onClick={showTrackModal}
          icon='ios-more'
        />
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  more: {
    position: 'absolute',
    borderWidth: 0,
    top: 0,
    right: 0
  },
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
    margin: 4,
    borderBottomWidth: 1,
    borderStyle: 'solid',
    borderColor: '#f0f0f0'
  }
})

const mapDispatchToProps = {
  showTrackModal: modalActions.showTrackModal
}

export default connect(null, mapDispatchToProps)(Track)
