import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getFeed, getItemsForFeed, feedActions } from '@core/feed'
import { getPlayerIsPlaying, getPlayerTrackId, playerActions } from '@core/player'
import { audio } from '@core/audio'
import Button from '@components/button'
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
  let lastContactId
  let groupCount = 0
  const groupLimit = 5
  let feedItems = []

  const contactItem = (contact) => {
    feedItems.push(
      <Contact contact={contact} key={feedItems.length} />
    )
  }

  items.forEach((item, index) => {
    // group items by contact and limit to groupLimit
    if (lastContactId !== item.contact.id) {
      contactItem(item.contact)
      lastContactId = item.contact.id
    } else {
      groupCount++
      if (groupCount >= groupLimit) {
        contactItem(item.contact)
        groupCount = 0
      }
    }

    switch (item.type) {
      case 'track':
        const track = item.content
        const isSelected = track.id === selectedTrackId
        feedItems.push(
          <Track
            key={feedItems.length}
            track={track}
            isPlaying={isSelected && isPlaying}
            isSelected={isSelected}
            pause={pause}
            play={isSelected ? play : selectTrack.bind(null, track.id)}
          />
        )
        break

      case 'contact':
        contactItem(item.content)
        break

      default:
        console.log(`invalid item type: ${item.type}`)
    }
  })

  const loading = (
    <Loading
      loading={displayLoadingIndicator}
      onClick={loadNextFeed}
      hasMore={hasMore}
    />
  )

  return render(feedItems, loading)
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
