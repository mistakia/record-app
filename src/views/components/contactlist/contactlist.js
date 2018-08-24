import React from 'react'
import { Link } from 'react-router-dom'

const render = ({ contactItems, loading, showAdd }) => (
  <div className='list'>
    {showAdd && <div className='list__action'>
      <Link className='button' to='/contacts/new'>Add Contact</Link>
    </div>}
    {contactItems}
    {loading}
  </div>
)

export default render
