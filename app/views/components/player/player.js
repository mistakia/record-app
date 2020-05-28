import React from 'react'
import hotkeys from 'hotkeys-js'

import Artwork from '@components/artwork'
import IconButton from '@components/icon-button'
import PlayerTimeline from '@components/player-timeline'
import AudioCurrentTime from '@components/audio-current-time'
import FormattedTime from '@components/formatted-time'
import Tags from '@components/tags'
import history from '@core/history'
import queryString from 'query-string'

import './player.styl'

export default class Player extends React.Component {
  constructor () {
    super()
    this._handleContextMenu = this._handleContextMenu.bind(this)
    this._handleTracklistClick = this._handleTracklistClick.bind(this)
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
      data: { trackId: track.id },
      clickX: event.clientX,
      clickY: event.clientY
    })
  }

  _handleTracklistClick () {
    const currentPath = history.location.pathname
    if (currentPath === '/listens') {
      return
    }

    const { tracklist } = this.props
    if (currentPath === tracklist.path) {
      this.props.loadTracks({ ...tracklist.toJS() })
    } else {
      const qs = queryString.stringify({
        addresses: tracklist.addresses.toJS(),
        tags: tracklist.tags.toJS(),
        query: tracklist.query,
        sort: tracklist.sort,
        order: tracklist.order
      })
      history.push(`${tracklist.path}?${qs}`)
    }
  }

  render () {
    const {
      isPlaying,
      repeat,
      toggleRepeat,
      nextTrack,
      pause,
      play,
      previousTrack,
      track,
      add,
      isLoading,
      shuffle,
      tracklist,
      tracklistAddress,
      tracklistLog,
      isShuffling,
      stopShuffle,
      remove,
      queue,
      app,
      isQueueVisible,
      toggleQueue
    } = this.props

    if (!track) return null

    const artworkUrl = track.thumbnail && `${track.thumbnail}?trackId=${track.id}`

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

          <Artwork className='player__track-artwork' url={artworkUrl} background />

          <div className='player__track-info' onContextMenu={this._handleContextMenu}>
            <div className='player__track-title'>{track.name}</div>
            <div className='player__track-artist'>{track.artist}</div>
            <div className='player__track-meta'>
              <small>{track.format}</small> · <small>{Math.round(track.bitrate / 1000)} kbps</small>
            </div>
            <div className='player__track-tags'>
              <Tags track={track} tracklistAddress={tracklistAddress} />
            </div>
          </div>
        </div>

        <div className='player__controls'>
          <div className='player__controls-actions'>
            <IconButton
              icon={repeat === 1 ? 'repeat-one' : 'repeat'}
              isActive={repeat > 0}
              label='repeat'
              onClick={toggleRepeat} />

            <IconButton
              icon='shuffle'
              label='Shuffle'
              isActive={isShuffling}
              onClick={isShuffling ? stopShuffle : shuffle.bind(null, tracklistAddress)}
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

            <IconButton
              icon='history'
              label='history'
              navlink='/listens' />
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
          <div className='player__tracklist-info cursor' onClick={this._handleTracklistClick}>
            {tracklistLog ? tracklistLog.displayName : tracklist.path.substring(1)}
          </div>
          <Artwork
            onClick={this._handleTracklistClick}
            className='player__tracklist-artwork cursor'
            url={tracklistLog && tracklistLog.avatar}
            background
          />
        </div>
      </div>
    )
  }
}
