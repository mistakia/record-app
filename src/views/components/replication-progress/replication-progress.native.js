import React from 'react'
import { StyleSheet, View } from 'react-native'

const ReplicationProgress = ({ progress }) => (
  <View style={styles.container}>
    <View style={{ width: progress + '%', ...styles.progress}} />
  </View>
)

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 45,
    right: 15,
    height: 4,
    width: 80,
    backgroundColor: 'lightgrey'
  },
  progress: {
    height: 4,
    backgroundColor: 'green'
  }
})

export default ReplicationProgress
