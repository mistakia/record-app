import React from 'react'
import { Link } from 'react-router-dom'

import Taglist from '@components/taglist'

const render = ({ trackItems, loading, showAdd, shuffle, tracklistId, isShuffling }) => (
  <div className='list'>
    <div className='list__action'>
      {showAdd && <Link className='button action' to='/new-track'>Add Track</Link>}
      {!isShuffling && <button className='button action' onClick={ shuffle.bind(null, tracklistId) }>Shuffle</button>}
    </div>

    <Taglist />
    {trackItems}
    {loading}
  </div>
)

export default render
