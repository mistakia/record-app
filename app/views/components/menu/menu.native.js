import React from 'react'
import { Link } from 'react-router-native'
import { StyleSheet, View, Text } from 'react-native'

const Menu = ({ app }) => (
  <View style={styles.menu}>
    <Link style={styles.menuItem} to='/explore'>
      <Text style={styles.menuItemText}>Explore</Text>
    </Link>
    <Link style={styles.menuItem} to={`/tracks${app.address}`}>
      <Text style={styles.menuItemText}>Tracks</Text>
    </Link>
    <Link style={styles.menuItem} to='/info'>
      <Text style={styles.menuItemText}>Info</Text>
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
    backgroundColor: '#2d2e2f',
    zIndex: 1
  },
  menuItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  menuItemText: {
    color: 'rgba(255,255,255,0.9)'
  }
})

export default Menu
