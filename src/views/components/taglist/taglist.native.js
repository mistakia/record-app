import React from 'react'
import { View, StyleSheet } from 'react-native'

const render = (tagItems, loading) => (
  <View style={styles.tagsContainer}>
    {tagItems}
    {loading}
  </View>
)

const styles = StyleSheet.create({
  tagsContainer: {
    padding: 5,
    flex: 1,
    flexWrap: 'wrap',
    flexDirection: 'row'
  }
})

export default render
