import React from 'react'

import './taglist.styl'

const render = (tagItems, loading) => (
  <div className='taglist'>
    {tagItems}
    {loading}
  </div>
)

export default render
