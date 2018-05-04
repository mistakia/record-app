import React from 'react'
import { View, Text } from 'react-native'

class Track extends React.Component {
  render() {
    const { track } = this.props

    return (
      <View>
	<Text>{track.title}</Text>
      </View>
    )
  }
}

export default Track
