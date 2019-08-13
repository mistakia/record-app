import React from 'react'
import hotkeys from 'hotkeys-js'

import IconButton from '@components/icon-button'
import PlayerTimeline from '@components/player-timeline'
import AudioCurrentTime from '@components/audio-current-time'
import FormattedTime from '@components/formatted-time'

import './player.styl'

export default class Player extends React.Component {
  componentDidMount () {
    hotkeys('space', { keydown: false, keyup: true }, () => {
      if (!this.props.track) return
      if (this.props.isLoading) return

      this.props.isPlaying ? this.props.pause() : this.props.play()
    })

    hotkeys('left', { keydown: false, keyup: true }, () => {
      this.props.previousTrack && this.props.previousTrack()
    })

    hotkeys('right', { keydown: false, keyup: true }, () => {
      this.props.nextTrack && this.props.nextTrack()
    })
  }

  render () {
    const {
      isPlaying,
      nextTrack,
      pause,
      play,
      previousTrack,
      track,
      add,
      isLoading,
      remove,
      app
    } = this.props

    if (!track) return null

    const { haveTrack } = track

    return (
      <div className='player'>
        <div className='player__artwork'>
          <img src={track.thumbnail} />
        </div>
        <div className='player__body'>
          <div className='player__body-info'>
            <div>{track.name}</div>
            <div>{track.artist}</div>
          </div>
          <div className='player__current-time'>
            <AudioCurrentTime />
          </div>
          <div className='player__track-duration'>
            <FormattedTime value={track.duration} unit={'ms'} />
          </div>
          <div className='player__track-bitrate'>
            <small>{Math.round(track.bitrate / 1000)} kbps</small>
          </div>
          <div className='player__track-encoder'>
            <small>{track.encoder}</small>
          </div>
          <PlayerTimeline />
        </div>
        <div className='player__controls'>
          <IconButton
            icon={haveTrack ? 'star-solid' : 'star-outline'}
            label={haveTrack ? 'Save' : 'Remove'}
            isLoading={track.isUpdating}
            onClick={haveTrack ? remove.bind(null, app.address, { trackId: track.id }) : add.bind(null, app.address, { cid: track.contentCID })}
          />

          <IconButton
            icon='skip-previous'
            label='Skip to previous track'
            onClick={previousTrack}
            disabled={!previousTrack}
          />

          <IconButton
            icon={isPlaying ? 'pause' : 'play'}
            label={isPlaying ? 'Pause' : 'Play'}
            isLoading={isLoading}
            onClick={isPlaying ? pause : play}
          />

          <IconButton
            icon='skip-next'
            label='Skip to next track'
            onClick={nextTrack}
            disabled={!nextTrack}
          />
        </div>
      </div>
    )
  }
}
