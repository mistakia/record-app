import React from 'react'

import './replication-progress.styl'

const render = ({ progressPercent }) => (
  <div id='replication-status'>
    <div className='replication-progress-container'>
      <div className='replication-progress' style={{ width: progressPercent + '%' }} />
    </div>
  </div>
)

export default render
