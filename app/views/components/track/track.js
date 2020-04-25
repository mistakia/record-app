import React from 'react'

import Artwork from '@components/artwork'
import IconButton from '@components/icon-button'
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
      trackId: track.id,
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
      trackId: track.id
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

    let artwork = track.thumbnail
    if (artwork && !haveTrack) {
      artwork += '?localOnly=true'
    }

    const classNames = ['track']
    if (isSelected) classNames.push('selected')
    if (contextMenuTrackId === track.id) classNames.push('context-menu-visible')

    return (
      <article
        className={classNames.join(' ')}
        onContextMenu={this._handleContextMenu}
        style={style}>
        <div className='track__index'>{index + 1}</div>
        <div className='track__save'>
          <IconButton
            icon={haveTrack ? 'star-solid' : 'star-outline'}
            label={haveTrack ? 'Save' : 'Remove'}
            isLoading={track.isUpdating}
            onClick={haveTrack ? remove.bind(null, app.address, { trackId: track.id }) : add.bind(null, app.address, { cid: track.contentCID })}
          />
        </div>
        <Artwork className='track__play' url={artwork} background>
          <IconButton
            icon={isPlaying ? 'pause' : 'play'}
            label={isPlaying ? 'Pause' : 'Play'}
            isLoading={isLoading}
            onClick={isPlaying ? pause : play}
          />
        </Artwork>
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
