import React from 'react'

import IconButton from '@components/icon-button'
import './tag.styl'

const Tag = ({ tag, onClick, remove }) => (
  <span className='tag'>
    <a onClick={onClick}>{tag}</a>
    {remove && <IconButton
                 icon='remove'
                 className='tag--remove'
                 label='remove'
                 onClick={remove} />}
  </span>
)

export default Tag
