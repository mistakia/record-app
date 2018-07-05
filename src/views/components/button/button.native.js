import React from 'react'
import { TouchableOpacity } from 'react-native'

function Button ({ children, onClick }) {
  return (
    <TouchableOpacity
      onPress={onClick}>
      {children}
    </TouchableOpacity>
  )
}

export default Button
