import React from 'react'
import { Link } from 'react-router-dom'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import InfiniteLoader from 'react-window-infinite-loader'

import Button from '@components/button'
import Taglist from '@components/taglist'
import Input from '@components/input'

const render = ({
  tracklistId,
  isItemLoaded,
  itemCount,
  loadMoreItems,
  isShuffling,
  showAdd,
  shuffle,
  Row,
  onSearch,
  onClear,
  searchQuery
}) => (
  <div className='list'>
    <div className='list__head'>
      <div className='list__header-row'>
        <Input
          onSubmit={onSearch}
          showClear={!!searchQuery}
          onClear={onClear}
          label='Click here to search'
          className='list__search'
        />
        <div className='list__action'>
          {showAdd && <Link className='button action' to='/new-track'>Add Track</Link>}
          {!isShuffling
            ? <Button className='action' onClick={shuffle.bind(null, tracklistId)}>Shuffle</Button>
            : <Button className='action' disabled>Shuffling</Button>
          }
        </div>
      </div>
      <Taglist />
      <div className='list__header track'>
        <div className='track__index' />
        <div className='track__actions' />
        <div className='track__play' />
        <div className='track__body'>Name</div>
        <div className='track__artist'>Artist</div>
        <div className='track__bitrate'>Bitrate</div>
        <div className='track__duration'>Time</div>
        <div className='track__encoder'>Type</div>
      </div>
    </div>
    <div className='list__body'>
      <InfiniteLoader
        isItemLoaded={isItemLoaded}
        itemCount={itemCount}
        loadMoreItems={loadMoreItems}>
        {({ onItemsRendered, ref }) => (
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                itemCount={itemCount}
                overscanCount={20}
                itemSize={50}
                onItemsRendered={onItemsRendered}
                ref={ref}
                width={width}>
                {Row}
              </List>
            )}
          </AutoSizer>
        )}
      </InfiniteLoader>
    </div>
  </div>
)

export default render
