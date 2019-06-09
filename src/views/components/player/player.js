import React from 'react'

import AudioCurrentTime from '@components/audio-current-time'
import AudioTimeline from '@components/audio-timeline'
import FormattedTime from '@components/formatted-time'
import IconButton from '@components/icon-button'

import './player.styl'

export default function Player ({
  isPlaying,
  isFullscreen,
  nextTrack,
  pause,
  play,
  previousTrack,
  toggleFullscreen,
  track
}) {
  if (!track) return null

  let classNames = ['player']
  if (isFullscreen) {
    classNames.push('player__fullscreen')
  }

  return (
    <div>

      <div className='player-timeline'>
        <AudioTimeline />
      </div>

      <div className={classNames.join(' ')}>

        <div className='player__controls'>
          <div className='player__artwork'>
            <img src={track.thumbnail} />
          </div>
          <IconButton
            icon='skip-previous'
            label='Skip to previous track'
            onClick={previousTrack}
            disabled={!previousTrack}
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
            disabled={!nextTrack}
          />
          <div className='player-controls__title'>{track.title}</div>

          <div className='player-controls__time'>
            <AudioCurrentTime /> / <FormattedTime value={track.duration} unit={'ms'} />
          </div>
        </div>
      </div>

    </div>
  )
}
