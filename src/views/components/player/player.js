import React from 'react'

import AudioCurrentTime from '@components/audio-current-time'
import AudioTimeline from '@components/audio-timeline'
import FormattedTime from '@components/formatted-time'
import IconButton from '@components/icon-button'

import './player.styl'

export default function Player ({
  isPlaying,
  nextTrack,
  pause,
  play,
  previousTrack,
  track
}) {
  if (!track) return null

  return (
    <div className='player'>
      <div className='player-timeline'>
        <AudioTimeline />
      </div>

      <div className='player-controls'>
        <div>
          <IconButton
            icon='skip-previous'
            label='Skip to previous track'
            onClick={previousTrack}
          />

          <IconButton
            icon={isPlaying ? 'pause' : 'play'}
            label={isPlaying ? 'Pause' : 'Play'}
            onClick={isPlaying ? pause : play}
          />

          <IconButton
            icon='skip-next'
            label='Skip to next track'
            onClick={nextTrack}
          />
        </div>

        <div className='player-controls__time'>
          <AudioCurrentTime /> / <FormattedTime value={track.duration} unit={'ms'} />
        </div>

        <div className='player-controls__title'>{track.title}</div>
      </div>
    </div>
  )
}
