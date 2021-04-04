import React from 'react'

import './taglist.styl'

const render = (tagItems) => (
  <div className='taglist'>
    <div className='tags'>
      {tagItems}
    </div>
  </div>
)

export default render
