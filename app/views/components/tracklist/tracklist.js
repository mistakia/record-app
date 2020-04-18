import React from 'react'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import InfiniteLoader from 'react-window-infinite-loader'

import IconButton from '@components/icon-button'
import Taglist from '@components/taglist'
import Input from '@components/input'

const render = ({
  loading,
  tracklistId,
  isItemLoaded,
  itemCount,
  loadMoreItems,
  isShuffling,
  stopShuffle,
  showAdd,
  shuffle,
  Row,
  onSearch,
  onClear,
  query,
  listRef
}) => (
  <div className='list'>
    <div className='list__head'>
      <div className='list__header-row'>
        <Input
          type='text'
          onSubmit={onSearch}
          showClear={!!query}
          defaultValue={query}
          onClear={onClear}
          label='Click here to search'
          className='list__search'
        />
        <div className='list__action'>
          {showAdd &&
            <IconButton
              className='action button__floating'
              icon='add'
              label='add tracks'
              link='/new-track' />}
          <IconButton
            icon='shuffle'
            label='Shuffle'
            isActive={isShuffling}
            onClick={isShuffling ? stopShuffle : shuffle.bind(null, tracklistId)}
          />
        </div>
      </div>
      <Taglist />
      <div className='list__header track'>
        <div className='track__index' />
        <div className='track__save' />
        <div className='track__play' />
        <div className='track__body'>Name</div>
        <div className='track__artist'>Artist</div>
        <div className='track__tags-add' />
        <div className='track__tags'>Tags</div>
        <div className='track__bitrate'>Bitrate</div>
        <div className='track__duration'>Time</div>
        <div className='track__format'>Format</div>
      </div>
    </div>
    <div className='list__body'>
      {(!loading && !itemCount) && <div className='list__body-empty'>Empty</div>}
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
                onItemsRendered={onItemsRendered}
                ref={listRef}
                itemSize={36}
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
