import React from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'

import IconButton from '@components/icon-button'

const Tag = ({ tag, onClick, remove }) => (
  <TouchableOpacity
    style={styles.tagContainer}
    onPress={onClick}>
    <Text style={[styles.tagItem, styles.tag]}>{tag}</Text>
    { remove && <IconButton
      icon='ios-close'
      style={[styles.tagItem, styles.remove]}
      iconStyle={styles.removeIcon}
      onClick={remove}
    /> }
  </TouchableOpacity>
)

const styles = StyleSheet.create({
  tagItem: {
    padding: 2,
    paddingLeft: 6,
    paddingRight: 6,
    marginLeft: 0,
    marginRight: 0
  },
  tagContainer: {
    flex: 0,
    marginRight: 4,
    marginBottom: 4,
    borderColor: '#c0c0c0',
    borderWidth: 1,
    borderRadius: 1,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  remove: {
    borderWidth: 0,
    borderLeftWidth: 1
  },
  removeIcon: {
    fontSize: 14
  },
  tag: {
    fontSize: 11,
    color: '#666'
  }
})

export default Tag
