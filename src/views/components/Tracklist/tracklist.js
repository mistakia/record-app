import React from 'react'

import LoadingIndicator from '@components/LoadingIndicator'
import Track from '@components/Track'

export default function Tracklist ({
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
      <div key={index}>
        <Track
          track={track}
          isPlaying={isSelected && isPlaying}
          isSelected={isSelected}
          pause={pause}
          play={isSelected ? play : selectTrack.bind(null, track.id, tracklistId)}
        />
      </div>
    )
  })

  return (
    <div>
      {trackItems}

      <div>
        {(this.props.displayLoadingIndicator) ? <LoadingIndicator /> : null}
      </div>
    </div>
  )
}
