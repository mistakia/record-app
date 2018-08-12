import React from 'react'

import LoadingIndicator from '@components/loading-indicator'
import Track from '@components/track'
import Contact from '@components/contact'
import Button from '@components/button'

export default function Feedlist ({
  displayLoadingIndicator,
  hasMore,
  items,
  isPlaying,
  play,
  pause,
  selectedTrackId,
  selectTrack,
  loadNextFeed
}) {
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

  const loadStatus = () => {
    if (displayLoadingIndicator) {
      return <LoadingIndicator />
    }

    if (hasMore) {
      return (
        <Button
          onClick={loadNextFeed}>
          Load More
        </Button>
      )
    }
  }
  return (
    <div>
      {feedItems}
      {loadStatus()}
    </div>
  )
}
