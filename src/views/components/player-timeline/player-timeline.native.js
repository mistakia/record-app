import React from 'react'
import {
  TouchableOpacity,
  View,
  StyleSheet
} from 'react-native'

export default class PlayerTimeline extends React.Component {
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
    let { percentBuffered, percentCompleted } = this.props.times

    return (
      <TouchableOpacity onPress={this.handleClick} style={styles.barContainer}>
        <View style={styles.bar}>
          <View style={[styles.complete, { width: percentCompleted }]} />
          <View style={[styles.buffer, { width: percentBuffered }]} />
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
    backgroundColor: '#f0f0f0'
  },
  complete: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#D3E478',
    height: 3
  },
  buffer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
    height: 3
  }
})
