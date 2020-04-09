import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Link } from 'react-router-native'

import Taglist from '@components/taglist'
import Button from '@components/button'

const render = ({ trackItems, loading, showAdd }) => (
  <View>
    {showAdd && <Link style={styles.button} component={Button} to='/new-track' text='Add Track' />}
    <Taglist />
    {trackItems}
    {loading}
  </View>
)

const styles = StyleSheet.create({
  button: {
    marginTop: 10,
    alignSelf: 'flex-end'
  }
})

export default render
