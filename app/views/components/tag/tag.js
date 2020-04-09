import React from 'react'

import IconButton from '@components/icon-button'
import './tag.styl'

const Tag = ({ tag, onClick, remove, count, isSelected }) => {
  return (
    <span className={`tag ${isSelected ? 'active' : ''}`}>
      <a onClick={onClick}>{tag}</a>
      { count && <span className='tag--count'>{count}</span> }
      {remove &&
        <IconButton icon='remove'
          className='tag--remove'
          label='remove'
          onClick={remove} />}
    </span>
  )
}

export default Tag
