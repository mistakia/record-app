import React from 'react'
import { TouchableOpacity } from 'react-native'

function Button ({ children, onClick, style }) {
  return (
    <TouchableOpacity
      style={style}
      onPress={onClick}>
      {children}
    </TouchableOpacity>
  )
}

export default Button
