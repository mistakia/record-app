import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getFeed, getItemsForFeed, feedActions } from '@core/feed'
import { getPlayerIsPlaying, getPlayerTrackId, playerActions } from '@core/player'
import { audio } from '@core/audio'
import Track from '@components/track'
import Contact from '@components/contact'
import Loading from '@components/loading'

import render from './feedlist'

const Feedlist = ({
  displayLoadingIndicator,
  hasMore,
  items,
  isPlaying,
  play,
  pause,
  selectedTrackId,
  selectTrack,
  loadNextFeed
}) => {
  const isItemLoaded = index => items.get(index)
  const itemCount = hasMore ? items.size + 1 : items.size
  const load = async () => loadNextFeed()
  const loadMoreItems = displayLoadingIndicator ? () => {} : load

  const Row = ({ style, index }) => {
    if (displayLoadingIndicator && (index + 1) === itemCount) {
      return <div style={style}><Loading loading /></div>
    }

    const item = items.get(index)
    if (!item) {
      return null
    }

    switch (item.type) {
      case 'track':
        const track = item.content
        const isSelected = track.id === selectedTrackId
        return (
          <Track
            key={items.size}
            style={style}
            track={track}
            isPlaying={isSelected && isPlaying}
            isSelected={isSelected}
            isFeed
            pause={pause}
            play={isSelected ? play : selectTrack.bind(null, track.id)}
          />
        )

      case 'contact':
        return (
          <Contact type='item' contact={item} key={items.size} style={style} />
        )

      default:
        console.log(`invalid item type: ${item.type}`)
        return null
    }
  }

  return render({
    Row,
    itemCount,
    isItemLoaded,
    loadMoreItems
  })
}

const mapStateToProps = createSelector(
  getFeed,
  getItemsForFeed,
  getPlayerIsPlaying,
  getPlayerTrackId,
  (feedlist, items, isPlaying, playerTrackId) => ({
    displayLoadingIndicator: feedlist.isPending,
    hasMore: feedlist.hasMore,
    items,
    isPlaying,
    play: audio.play,
    pause: audio.pause,
    selectedTrackId: playerTrackId
  })
)

const mapDispatchToProps = {
  selectTrack: playerActions.playSelectedTrack,
  loadNextFeed: feedActions.loadNextFeed
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Feedlist)
