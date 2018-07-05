import React from 'react'

import Button from '@components/button'
import Icon from '@components/icon'

function IconButton({ icon, label, onClick }) {
  return (
    <Button
      onClick={onClick}>
      <Icon name={icon} />
    </Button>
  )
}

export default IconButton
