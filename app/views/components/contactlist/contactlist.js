import React from 'react'

import IconButton from '@components/icon-button'

const render = ({ contactItems, loading, showAdd }) => (
  <div className='list'>
    <div className='list__head'>
      {showAdd &&
        <IconButton
          className='action button__floating'
          icon='add'
          label='add contact'
          link='/new-contact' /> }
    </div>
    <div className='list__header contact contact__item'>
      <div className='contact__main'>
        <div className='contact__avatar' />
        <div className='contact__title'>Name</div>
      </div>
      <div className='contact__side'>
        <div>Last Updated</div>
        <div>Entries</div>
      </div>
    </div>
    <div className='list__body'>
      {contactItems}
      {loading}
      {(!loading && !contactItems.size) && <div className='list__body-empty'>Empty</div>}
    </div>
  </div>
)

export default render
