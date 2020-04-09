import React from 'react'

import './progress.styl'

const render = ({ progress }) => (
  <div className='progress-container'>
    <div className='progress-bar' style={{ width: progress + '%' }} />
  </div>
)

export default render
