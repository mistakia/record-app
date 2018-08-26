import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'

const defaultStyle = {
  marginLeft: 5,
  marginRight: 5,
  padding: 5,
  borderRadius: 2,
  borderColor: 'rgba(0,0,0,0.05)',
  backgroundColor: '#f6f6f6',
  borderWidth: 1,
  justifyContent: 'center',
  alignItems: 'center'
}

function Button ({ children, onClick, onPress, text, style = {} }) {
  style = [defaultStyle, style]
  const content = text ? <Text style={styles.text}>{text}</Text> : children
  return (
    <TouchableOpacity
      style={style}
      onPress={onClick || onPress}>
      {content}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  text: {
    color: 'rgba(0,0,0,0.66)'
  }
})

export default Button
