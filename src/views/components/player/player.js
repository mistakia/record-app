import React from 'react'
import hotkeys from 'hotkeys-js'
import IconButton from '@material-ui/core/IconButton'
import StarIcon from '@material-ui/icons/Star'
import StarOutlineIcon from '@material-ui/icons/StarOutline'
import RepeatIcon from '@material-ui/icons/Repeat'
import RepeatOneIcon from '@material-ui/icons/RepeatOne'
import ShuffleIcon from '@material-ui/icons/Shuffle'
import SkipPreviousIcon from '@material-ui/icons/SkipPrevious'
import PauseIcon from '@material-ui/icons/Pause'
import PlayArrowIcon from '@material-ui/icons/PlayArrow'
import CircularProgress from '@material-ui/core/CircularProgress'
import SkipNextIcon from '@material-ui/icons/SkipNext'
import PlaylistPlayIcon from '@material-ui/icons/PlaylistPlay'
import HistoryIcon from '@material-ui/icons/History'
import { NavLink } from 'react-router-dom'
import Badge from '@material-ui/core/Badge'
import Tooltip from '@material-ui/core/Tooltip'

import Artwork from '@components/artwork'
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
      toggleQueue,
      trackId
    } = this.props

    if (!trackId && !queue.size) return null

    const HistoryNavLink = React.forwardRef((props, ref) => <div ref={ref}><NavLink {...props} /></div>)
    const artworkUrl = track.thumbnail && `${track.thumbnail}?trackId=${track.id}`

    const { haveTrack } = track

    return (
      <div className='player'>
        <div className='player__track'>
          <div className='player__track-actions'>
            <IconButton
              disabled={track.isUpdating}
              onClick={haveTrack ? remove.bind(null, app.address, { trackId: track.id }) : add.bind(null, app.address, { cid: track.contentCID })}>
              {track.isUpdating ? <CircularProgress size={24} /> : (haveTrack ? <StarIcon className='track__star' /> : <StarOutlineIcon />)}
            </IconButton>
          </div>

          <Artwork className='player__track-artwork' url={artworkUrl} background />

          <div className='player__track-info' onContextMenu={this._handleContextMenu}>
            <div className='player__track-title'>{track.name}</div>
            <div className='player__track-artist'>{track.artist}</div>
            <div className='player__track-meta'>
              {track.format && <span>{track.format}</span>}
              {track.format && <span> · </span>}
              <span>{Math.round(track.bitrate / 1000)} kbps</span>
            </div>
            <div className='player__track-tags'>
              <Tags track={track} tracklistAddress={tracklistAddress} />
            </div>
          </div>
        </div>

        <div className='player__controls'>
          <div className='player__controls-actions'>
            <IconButton className={repeat > 0 ? 'active' : undefined} onClick={toggleRepeat}>
              {repeat === 1 ? <RepeatOneIcon /> : <RepeatIcon />}
            </IconButton>

            <IconButton
              className={isShuffling ? 'active' : undefined}
              onClick={isShuffling ? stopShuffle : shuffle.bind(null, tracklistAddress)}
            >
              <ShuffleIcon />
            </IconButton>

            <IconButton onClick={previousTrack} disabled={!previousTrack}>
              <SkipPreviousIcon />
            </IconButton>

            <IconButton className='player__controls-play' disabled={isLoading} onClick={isPlaying ? pause : play}>
              {isLoading
                ? <CircularProgress size={24} />
                : (isPlaying ? <PauseIcon /> : <PlayArrowIcon />)}
            </IconButton>

            <IconButton onClick={nextTrack} disabled={!nextTrack}>
              <SkipNextIcon />
            </IconButton>

            <Tooltip title='Play Queue'>
              <IconButton
                className={isQueueVisible ? 'active' : undefined}
                onClick={toggleQueue}>
                <Badge badgeContent={queue.size}>
                  <PlaylistPlayIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title='Listening History'>
              <IconButton component={HistoryNavLink} to='/listens'>
                <HistoryIcon />
              </IconButton>
            </Tooltip>
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
            <div className='player__tracklist-info-lead'>{tracklistLog ? tracklistLog.displayName : (tracklist.path && tracklist.path.substring(1))}</div>
            <div className='player__tracklist-info-subtitle'>Playing from</div>
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
