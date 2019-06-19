import React from 'react'

import './replication-progress.styl'

const render = ({ progress }) => (
    <div id='replication-status'>
      <div className='replication-progress-container'>
        <div className='replication-progress' style={{ width: progress + '%' }}/>
      </div>
    </div>
)

export default render
