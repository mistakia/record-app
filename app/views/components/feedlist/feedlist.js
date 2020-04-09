import React from 'react'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import InfiniteLoader from 'react-window-infinite-loader'

const render = ({
  Row,
  itemCount,
  isItemLoaded,
  loadMoreItems
}) => (
  <div className='list'>
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
                width={width}
                itemCount={itemCount}
                onItemsRendered={onItemsRendered}
                ref={ref}
                itemSize={50}>
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
