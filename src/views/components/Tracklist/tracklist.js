import React from 'react'

import LoadingIndicator from '@components/loading-indicator'
import Track from '@components/track'

export default function Tracklist ({
  displayLoadingIndicator,
  isPlaying,
  pause,
  play,
  selectedTrackId,
  selectTrack,
  tracklistId,
  tracks
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

  return (
    <div>
      {trackItems}

      <div>
        {(displayLoadingIndicator) ? <LoadingIndicator /> : null}
      </div>
    </div>
  )
}
