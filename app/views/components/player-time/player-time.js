import React from 'react'

import AudioCurrentTime from '@components/audio-current-time'
import FormattedTime from '@components/formatted-time'

import './player-time.styl'

export default function PlayerTime ({
  track
}) {
  if (!track) return null

  return (
    <div id='player-time'>
      <AudioCurrentTime /> / <FormattedTime value={track.duration} unit={'ms'} />
    </div>
  )
}
