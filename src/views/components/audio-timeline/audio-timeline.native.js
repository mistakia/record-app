import React from 'react'
import {
  TouchableOpacity,
  View,
  StyleSheet
} from 'react-native'

export default class AudioTimeline extends React.Component {
  constructor () {
    super(...arguments)
    this.handleClick = this.handleClick.bind(this)
  }

  handleClick (event) {
    const { currentTarget, pageX } = event
    const { seek, times } = this.props

    seek(
      (pageX - currentTarget.getBoundingClientRect().left) / currentTarget.offsetWidth * times.duration
    )
  }

  render () {
    let { bufferedTime, percentBuffered, percentCompleted } = this.props.times

    return (
      <TouchableOpacity onPress={this.handleClick} style={styles.barContainer}>
        <View style={styles.bar}>
          <View style={[styles.complete, { width: percentCompleted }]}></View>
          <View style={[styles.buffer, { width: percentBuffered }]}></View>
        </View>
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  barContainer: {
    ...StyleSheet.asboluteFillObject,
    width: '100%',
    height: 3
  },
  bar: {
    width: '100%',
    height: 3,
    backgroundColor: '#F0F0F0'
  },
  complete: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#D3E478',
    height: 3
  },
  buffer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#666666',
    height: 3
  }
})
