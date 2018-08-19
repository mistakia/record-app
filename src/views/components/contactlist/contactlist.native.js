import React from 'react'
import { View } from 'react-native'

const render = (contactItems, loading) => (
  <View>
    {contactItems}
    {loading}
  </View>
)

export default render
