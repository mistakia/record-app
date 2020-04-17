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
      <div className='contact__main'>
        <div className='contact__avatar' />
        <div className='contact__title'>Name</div>
      </div>
      <div className='contact__side'>
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
