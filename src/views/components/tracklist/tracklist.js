import React from 'react'
import { Link } from 'react-router-dom'

import Button from '@components/button'
import Taglist from '@components/taglist'
import Input from '@components/input'

const render = ({
  tracklistId,
  searchItems,
  trackItems,
  loading,
  isShuffling,
  showAdd,
  shuffle,
  onSearch,
  onClear,
  searchQuery
}) => (
  <div className='list'>
    <div className='list__action'>
      {showAdd && <Link className='button action' to='/new-track'>Add Track</Link>}
      {!isShuffling && <Button className='action' onClick={shuffle.bind(null, tracklistId)}>Shuffle</Button>}
    </div>

    <Input onSubmit={onSearch} showClear={!!searchQuery} onClear={onClear} />

    <Taglist />
    {searchItems}
    {!searchQuery && trackItems}
    {loading}
  </div>
)

export default render
