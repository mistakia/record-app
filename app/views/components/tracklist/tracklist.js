import React from 'react'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import InfiniteLoader from 'react-window-infinite-loader'

import EmptyMessage from '@components/empty-message'
import IconButton from '@components/icon-button'
import Taglist from '@components/taglist'
import Input from '@components/input'
import TracklistFilter from '@components/tracklist-filter'

const render = ({
  loading,
  hideTaglist,
  hideSearch,
  tracklistAddress,
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
  isEmpty,
  query,
  listRef,
  log,
  reorder
}) => (
  <div className='list'>
    <div className='list__head'>
      {!hideSearch && <div className='list__header-row'>
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
              link='/importer' />}
          <IconButton
            icon='shuffle'
            label='Shuffle'
            isActive={isShuffling}
            onClick={isShuffling ? stopShuffle : shuffle.bind(null, tracklistAddress)}
          />
        </div>
      </div>}
      {!hideTaglist && <Taglist />}
      <div className='list__header track'>
        <div className='track__play' />
        <div className='track__save' />
        <TracklistFilter type='title' className='track__body' />
        <TracklistFilter type='artist' className='track__artist' />
        <div className='track__tags-add' />
        <div className='track__tags'>Tags</div>
        <TracklistFilter type='bitrate' className='track__bitrate' />
        <TracklistFilter type='duration' title='Time' className='track__duration' />
        <div className='track__format'>Format</div>
        <div className='track__listens'>Listens</div>
      </div>
    </div>
    <div className='list__body'>
      { isEmpty
        ? <EmptyMessage log={log} />
        : <InfiniteLoader isItemLoaded={isItemLoaded} itemCount={itemCount} loadMoreItems={loadMoreItems}>
          {({ onItemsRendered, ref }) => (
            <AutoSizer>
              {({ height, width }) => (
                <List
                  height={height}
                  itemCount={itemCount}
                  overscanCount={50}
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
      }
    </div>
  </div>
)

export default render
