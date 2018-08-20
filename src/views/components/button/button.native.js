import React from 'react'
import { TouchableOpacity } from 'react-native'

const defaultStyle = {
  marginLeft: 5,
  marginRight: 5,
  padding: 5,
  borderColor: '#CCC',
  borderWidth: 1,
  justifyContent: 'center',
  alignItems: 'center'
}

function Button ({ children, onClick, onPress, style = {} }) {
  style = [defaultStyle, style]
  return (
    <TouchableOpacity
      style={style}
      onPress={onClick || onPress}>
      {children}
    </TouchableOpacity>
  )
}

export default Button
