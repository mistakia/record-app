import React from 'react'

import IconButton from '@components/icon-button'
import './tag.styl'

const Tag = ({ tag, onClick, remove, count, isSelected, isExternal }) => {
  const classNames = ['tag']
  if (isSelected) classNames.push('active')
  if (isExternal) classNames.push('external')
  return (
    <div className={classNames.join(' ')}>
      <a onClick={onClick}>{tag}</a>
      { count && <span className='tag__count'>{count}</span> }
      {remove &&
        <IconButton icon='remove'
          className='tag__remove'
          label='remove'
          onClick={remove} />}
    </div>
  )
}

export default Tag
