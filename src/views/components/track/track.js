import React from 'react'

import IconButton from '@components/icon-button'
import FormattedTime from '@components/formatted-time'
import Tags from '@components/tags'

import './track.styl'

class Track extends React.Component {
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
      index
    } = this.props

    if (!track) {
      return null
    }

    const { haveTrack } = track

    let artwork = track.thumbnail
    if (artwork && !haveTrack) {
      artwork += '?localOnly=true'
    }

    return (
      <article className='track' style={style}>
        <div className='track__index'>{index}</div>
        <div className='track__actions'>
          <IconButton
            icon={haveTrack ? 'star-solid' : 'star-outline'}
            label={haveTrack ? 'Save' : 'Remove'}
            isLoading={track.isUpdating}
            onClick={haveTrack ? remove.bind(null, app.address, { trackId: track.id }) : add.bind(null, app.address, { cid: track.contentCID })}
          />
        </div>
        <div className='track__play' style={artwork && {backgroundImage: `url("${artwork}")`}}>
          <IconButton
            icon={isPlaying ? 'pause' : 'play'}
            label={isPlaying ? 'Pause' : 'Play'}
            isLoading={isLoading}
            onClick={isPlaying ? pause : play}
          />
        </div>
        <div className='track__body'>
          <div className='track__title'>{track.name}</div>
          <Tags track={track} textOnly />
        </div>
        <div className='track__artist'>{track.artist}</div>
        <small className='track__bitrate'>{Math.round(track.bitrate / 1000)}</small>
        <small className='track__duration'>
          <FormattedTime value={track.duration} unit={'ms'} />
        </small>
        <small className='track__format'>{track.format}</small>
      </article>
    )
  }
}

export default Track
