import React from 'react'
import { Link } from 'react-router-dom'

const render = ({ contactItems, loading, showAdd }) => (
  <div className='list'>
    <div className='list__head'>
      {showAdd && <div className='list__action'>
        <Link className='button' to='/new-contact'>Add Contact</Link>
      </div>}
    </div>
    <div className='list__header contact contact__item'>
      <div className='contact__avatar' />
      <div className='contact__body'>
        <div className='contact__title'>Name</div>
        <div>Followers</div>
        <div>Status</div>
        <div>Entries</div>
        <div>Tracks</div>
        <div>Contacts</div>
      </div>
      <div className='contact__actions' />
    </div>
    <div className='list__body'>
      {contactItems}
      {loading}
      {(!loading && !contactItems.size) && <div className='list__body-empty'>Empty</div>}
    </div>
  </div>
)

export default render
