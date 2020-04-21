import React from 'react'
import hotkeys from 'hotkeys-js'

import Artwork from '@components/artwork'
import IconButton from '@components/icon-button'
import PlayerTimeline from '@components/player-timeline'
import AudioCurrentTime from '@components/audio-current-time'
import FormattedTime from '@components/formatted-time'
import Tags from '@components/tags'

import './player.styl'

export default class Player extends React.Component {
  constructor () {
    super()
    this._handleContextMenu = this._handleContextMenu.bind(this)
  }

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

  _handleContextMenu (event) {
    const { track, showContext } = this.props
    showContext({
      id: 'track',
      trackId: track.id,
      clickX: event.clientX,
      clickY: event.clientY
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
      shuffle,
      tracklistAddress,
      isShuffling,
      tags,
      query,
      stopShuffle,
      remove,
      queue,
      loadTracks,
      app,
      isQueueVisible,
      tracklistLog,
      toggleQueue
    } = this.props

    if (!track) return null

    const { haveTrack } = track

    return (
      <div className='player'>
        <div className='player__track'>
          <div className='player__track-actions'>
            <IconButton
              icon={haveTrack ? 'star-solid' : 'star-outline'}
              label={haveTrack ? 'Save' : 'Remove'}
              isLoading={track.isUpdating}
              onClick={haveTrack ? remove.bind(null, app.address, { trackId: track.id }) : add.bind(null, app.address, { cid: track.contentCID })}
            />
          </div>

          <Artwork className='player__track-artwork' url={track.thumbnail} background />

          <div className='player__track-info' onContextMenu={this._handleContextMenu}>
            <div className='player__track-title'>{track.name}</div>
            <div className='player__track-artist'>{track.artist}</div>
            <div className='player__track-meta'>
              <small>{track.format}</small> · <small>{Math.round(track.bitrate / 1000)} kbps</small>
            </div>
            <div className='player__track-tags'>
              <Tags track={track} />
            </div>
          </div>
        </div>

        <div className='player__controls'>
          <div className='player__controls-actions'>
            <IconButton
              icon='shuffle'
              label='Shuffle'
              isActive={isShuffling}
              onClick={isShuffling ? stopShuffle : shuffle.bind(null, tracklistAddress)}
              disabled={!isShuffling && !tracklistAddress}
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

            <IconButton
              icon='play-queue'
              count={queue.size ? queue.size : undefined}
              isActive={isQueueVisible}
              onClick={toggleQueue}
              label='play-queue' />
          </div>

          <div className='player__timeline'>
            <div className='player__timeline-time'>
              <AudioCurrentTime />
            </div>
            <PlayerTimeline />
            <div className='player__timeline-duration'>
              <FormattedTime value={track.duration} unit={'ms'} />
            </div>
          </div>
        </div>

        <div className='player__tracklist'>
          <div className='player__tracklist-info cursor' onClick={loadTracks.bind(null, { logAddress: tracklistLog.address, query, tags })}>
            {tracklistLog.displayName}
          </div>
          <Artwork className='player__tracklist-artwork' url={tracklistLog.avatar} background />
        </div>
      </div>
    )
  }
}
