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
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 5,
    paddingRight: 5,
    marginBottom: -5,
    flex: 1,
    flexWrap: 'wrap',
    flexDirection: 'row'
  }
})

export default render
