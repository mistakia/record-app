import React from 'react'
import { View } from 'react-native'

const render = (feedItems, loading) => (
  <View>
    {feedItems}
    {loading}
  </View>
)

export default render
