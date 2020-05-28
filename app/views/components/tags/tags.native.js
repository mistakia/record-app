import React from 'react'
import { StyleSheet, View } from 'react-native'

export default function () {
  return (
    <View>
      <View style={styles.tagsContainer}>
        {this.getTagItems()}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tagsContainer: {
    flex: 1,
    marginLeft: 5,
    flexWrap: 'wrap',
    flexDirection: 'row'
  }
})
