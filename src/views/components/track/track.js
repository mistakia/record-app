import React from 'react'
import CircularProgress from '@material-ui/core/CircularProgress'
import PauseIcon from '@material-ui/icons/Pause'
import PlayArrowIcon from '@material-ui/icons/PlayArrow'
import StarIcon from '@material-ui/icons/Star'
import StarOutlineIcon from '@material-ui/icons/StarOutline'
import IconButton from '@material-ui/core/IconButton'

import FormattedTime from '@components/formatted-time'
import Tags from '@components/tags'

import './track.styl'

class Track extends React.Component {
  constructor () {
    super()
    this._handleContextMenu = this._handleContextMenu.bind(this)
    this._handleClick = this._handleClick.bind(this)
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

  _handleClick (event) {
    const { track, showContext } = this.props
    showContext({
      id: 'tag',
      clickX: event.clientX,
      clickY: event.clientY,
      data: { trackId: track.id }
    })
  }

  render () {
    const {
      track,
      isPlaying,
      isSelected,
      isLoading,
      pause,
      play,
      remove,
      add,
      app,
      style,
      index,
      tracklistAddress,
      contextMenuTrackId
    } = this.props

    if (!track) {
      return null
    }

    const { haveTrack } = track

    const classNames = ['track']
    if (isSelected) classNames.push('selected')
    if (contextMenuTrackId === track.id) classNames.push('context-menu-visible')

    return (
      <article
        className={classNames.join(' ')}
        onContextMenu={this._handleContextMenu}
        style={style}>
        <div className='track__play' data-index={index + 1}>
          <IconButton onClick={isPlaying ? pause : play} disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : (isPlaying ? <PauseIcon /> : <PlayArrowIcon />)}
          </IconButton>
        </div>
        <div className='track__save'>
          <IconButton
            disabled={track.isUpdating}
            onClick={haveTrack ? remove.bind(null, app.address, { trackId: track.id }) : add.bind(null, app.address, { cid: track.contentCID })}>
            {track.isUpdating ? <CircularProgress size={18} /> : (haveTrack ? <StarIcon className='track__star' /> : <StarOutlineIcon />)}
          </IconButton>
        </div>
        <div className='track__body'>
          <div className={`track__title ${track.isLocal ? 'track__available' : ''}`}>{track.name}</div>
        </div>
        <div className='track__artist'>{track.artist}</div>
        <div className='track__tags-add cursor' onClick={this._handleClick}>+Tag</div>
        <div className='track__tags'>
          <Tags track={track} tracklistAddress={tracklistAddress} />
        </div>
        <small className='track__bitrate'>{track.bitrate ? Math.round(parseInt(track.bitrate) / 1000) : 'Nan'}</small>
        <small className='track__duration'>
          <FormattedTime value={track.duration} unit={'ms'} />
        </small>
        <small className='track__format'>{track.format}</small>
        <small className='track__listens'>{track.listens.size || null}</small>
      </article>
    )
  }
}

export default Track
