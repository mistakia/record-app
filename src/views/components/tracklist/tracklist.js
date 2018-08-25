import React from 'react'
import { Link } from 'react-router-dom'

import Taglist from '@components/taglist'

const render = ({ trackItems, loading, showAdd }) => (
  <div className='list'>
    {showAdd && <div className='list__action'>
      <Link className='button' to='/new-track'>Add Track</Link>
    </div>}
    <Taglist />
    {trackItems}
    {loading}
  </div>
)

export default render
