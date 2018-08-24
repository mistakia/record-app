import React from 'react'
import { Link } from 'react-router-native'
import { StyleSheet, View, Text } from 'react-native'

const Menu = ({ app }) => (
  <View style={styles.menu}>
    <Link style={styles.menuItem} to='/feed'>
      <Text>Feed</Text>
    </Link>
    <Link style={styles.menuItem} to={`/tracks${app.address}`}>
      <Text>Tracks</Text>
    </Link>
    <Link style={styles.menuItem} to={`/contacts${app.address}`}>
      <Text>Contacts</Text>
    </Link>
    <Link style={styles.menuItem} to='/info'>
      <Text>Info</Text>
    </Link>
  </View>
)

const styles = StyleSheet.create({
  menu: {
    ...StyleSheet.absoluteFillObject,
    bottom: 0,
    top: 'auto',
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    zIndex: 1
  },
  menuItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
})

export default Menu
