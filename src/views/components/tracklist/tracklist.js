import React from 'react'

import LoadingIndicator from '@components/loading-indicator'
import Track from '@components/track'
import Button from '@components/button'

export default function Tracklist ({
  displayLoadingIndicator,
  isPlaying,
  pause,
  play,
  selectedTrackId,
  selectTrack,
  tracklistId,
  tracks,
  hasMore,
  loadNextTracks,
  tags
}) {
  const trackItems = tracks.map((track, index) => {
    const isSelected = track.id === selectedTrackId
    return (
      <Track
        key={index}
        track={track}
        isPlaying={isSelected && isPlaying}
        isSelected={isSelected}
        pause={pause}
        play={isSelected ? play : selectTrack.bind(null, track.id, tracklistId)}
      />
    )
  })

  const loadStatus = () => {
    if (displayLoadingIndicator) {
      return <LoadingIndicator />
    }

    if (hasMore) {
      return (
        <Button
          onClick={loadNextTracks}>
          Load More
        </Button>
      )
    }
  }

  return (
    <div>
      {trackItems}
      {loadStatus()}
    </div>
  )
}
