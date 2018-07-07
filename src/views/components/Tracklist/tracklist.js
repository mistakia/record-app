import React from 'react'

import LoadingIndicator from '@components/LoadingIndicator'
import Track from '@components/Track'

export default function Tracklist ({ tracks, displayLoadingIndicator }) {
  const trackItems = tracks.map((track, index) => {
    return (
      <div key={index}>
        <Track track={track} />
      </div>
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
