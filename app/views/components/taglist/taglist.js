import React from 'react'

import './taglist.styl'

const render = (tagItems, loading) => (
  <div className='taglist'>
    <div className='tags'>
      {tagItems}
    </div>
    {loading}
  </div>
)

export default render
