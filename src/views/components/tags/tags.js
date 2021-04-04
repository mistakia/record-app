import React from 'react'

import './tags.styl'

export default function () {
  return (
    <div className='tags'>
      {this.getTagItems()}
    </div>
  )
}
