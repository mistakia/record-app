import React from 'react'
import Iconicons from 'react-native-vector-icons/Ionicons'

function Icon ({ name, iconStyle }) {
  return (
    <Iconicons name={name} style={iconStyle} />
  )
}

export default Icon
