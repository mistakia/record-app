import React from 'react'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import InfiniteLoader from 'react-window-infinite-loader'
import Fab from '@material-ui/core/Fab'
import AddIcon from '@material-ui/icons/Add'
import { Link } from 'react-router-dom'
import ShuffleIcon from '@material-ui/icons/Shuffle'
import IconButton from '@material-ui/core/IconButton'
import CircularProgress from '@material-ui/core/CircularProgress'

import EmptyMessage from '@components/empty-message'
import Taglist from '@components/taglist'
import Input from '@components/input'
import TracklistFilter from '@components/tracklist-filter'

const render = ({
  isLoading,
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
}) => {
  let body
  if (isLoading && !isEmpty && itemCount < 2) {
    body = (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px'
        }}
      >
        <CircularProgress size={30} />
      </div>
    )
  } else if (isEmpty) {
    body = <EmptyMessage log={log} />
  } else {
    body = (
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
    )
  }

  return (
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
              <Fab component={Link} to='/importer'>
                <AddIcon />
              </Fab>}
            <IconButton
              className={isShuffling ? 'active' : undefined}
              onClick={isShuffling ? stopShuffle : shuffle.bind(null, tracklistAddress)}>
              <ShuffleIcon />
            </IconButton>
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
        {body}
      </div>
    </div>
  )
}
export default render
