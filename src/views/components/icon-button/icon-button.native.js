import React from 'react'

import Button from '@components/button'
import Icon from '@components/icon'

function IconButton ({ icon, onClick, style, iconStyle }) {
  return (
    <Button
      style={style}
      onClick={onClick}>
      <Icon name={icon} iconStyle={iconStyle} />
    </Button>
  )
}

export default IconButton
