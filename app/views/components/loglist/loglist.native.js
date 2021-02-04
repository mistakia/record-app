import React from 'react'
import { View, StyleSheet } from 'react-native'
// import { Link } from 'react-router-native'

const render = ({ logItems, loading, showAdd }) => (
  <View>
    {/* {showAdd && <Link style={styles.button} component={Button} to='/link-log' text='Link Log' />} */}
    <View style={styles.loglist}>
      {logItems}
      {loading}
    </View>
  </View>
)

const styles = StyleSheet.create({
  loglist: {
    marginTop: 15
  },
  button: {
    marginTop: 10,
    marginRight: 10,
    alignSelf: 'flex-end'
  }
})

export default render
