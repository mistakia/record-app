import React from 'react'
import Chip from '@material-ui/core/Chip'
import Badge from '@material-ui/core/Badge'

import './tag.styl'

const Tag = ({ tag, onClick, remove, count, isSelected, isExternal }) => {
  const classNames = ['tag']
  if (isSelected) classNames.push('selected')
  if (!isExternal) classNames.push('internal')

  return (
    <Badge badgeContent={count}>
      <Chip className={classNames.join(' ')} size='small' label={tag} onClick={onClick} onDelete={remove} variant='outlined' />
    </Badge>
  )
}

export default Tag
