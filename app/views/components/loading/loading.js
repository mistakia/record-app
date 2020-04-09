import React from 'react'

import Button from '@components/button'
import LoadingIndicator from '@components/loading-indicator'

import './loading.styl'

const Loading = ({
  hasMore,
  loading,
  onClick
}) => {
  if (loading) {
    return <div className='loading'><LoadingIndicator /></div>
  }

  if (hasMore) {
    return (
      <Button
        onClick={onClick}
        className='loading'>
        Load More
      </Button>
    )
  }

  return null
}

export default Loading
