import React from 'react'

import IconButton from '@components/icon-button'

const render = ({ logItems, loading, showAdd }) => (
  <div className='list'>
    <div className='list__head'>
      {showAdd &&
        <IconButton
          className='action button__floating'
          icon='add'
          label='link log'
          link='/link-log' /> }
    </div>
    <div className='list__header log log__item'>
      <div className='log__main'>
        <div className='log__avatar' />
        <div className='log__title'>Name</div>
      </div>
      <div className='log__side'>
        <div>Last Updated</div>
        <div>Entries</div>
      </div>
    </div>
    <div className='list__body'>
      {logItems}
      {loading}
      {(!loading && !logItems.size) && <div className='list__body-empty'>Empty</div>}
    </div>
  </div>
)

export default render
