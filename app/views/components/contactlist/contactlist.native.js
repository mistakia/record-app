import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Link } from 'react-router-native'

import Button from '@components/button'

const render = ({ contactItems, loading, showAdd }) => (
  <View>
    {showAdd && <Link style={styles.button} component={Button} to='/new-contact' text='Add Contact' />}
    <View style={styles.contactlist}>
      {contactItems}
      {loading}
    </View>
  </View>
)

const styles = StyleSheet.create({
  contactlist: {
    marginTop: 15
  },
  button: {
    marginTop: 10,
    marginRight: 10,
    alignSelf: 'flex-end'
  }
})

export default render
