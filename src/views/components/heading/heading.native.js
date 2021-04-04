import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

const Heading = ({ title }) => (
  <View style={styles.container}>
    <View style={styles.divider} />
    <View style={styles.textContainer}>
      <Text style={styles.text}>{title.toUpperCase()}</Text>
    </View>
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 20,
    marginTop: 25,
    position: 'relative'
  },
  divider: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 15,
    borderTopWidth: 1,
    borderColor: '#f0f0f0'
  },
  textContainer: {
    position: 'absolute',
    top: 8,
    left: 12,
    paddingLeft: 2,
    paddingRight: 2,
    backgroundColor: 'white'
  },
  text: {
    fontSize: 10,
    fontFamily: 'Verdana',
    letterSpacing: 3
  }
})

export default Heading
