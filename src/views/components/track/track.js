import React from 'react'

import IconButton from '@components/icon-button'
import FormattedTime from '@components/formatted-time'
import Tags from '@components/tags'

import './track.styl'

class Track extends React.Component {
  render () {
    const {
      track,
      tracklistId,
      isPlaying,
      isSelected,
      isLoading,
      pause,
      play,
      removeTrack,
      addTrack
    } = this.props

    if (!track) {
      return null
    }

    const { haveTrack } = track

    return (
      <article className='track'>
        <div className='track__play'>
          <IconButton
            icon={isPlaying ? 'pause' : 'play'}
            label={isPlaying ? 'Pause' : 'Play'}
            isLoading={isLoading}
            onClick={isPlaying ? pause : play}
          />
          <img src={track.thumbnail} />
        </div>
        <div className='track__body'>
          <div className='track__title'>{track.title}</div>
          <small className='track__duration'>
            <FormattedTime value={track.duration} unit={'ms'} />
          </small>
        </div>
        <div className='track__actions'>
          <IconButton
            icon={haveTrack ? 'star-solid' : 'star-outline'}
            label={haveTrack ? 'Save' : 'Remove'}
            isLoading={track.isUpdating}
            onClick={haveTrack ? removeTrack.bind(null, tracklistId, { trackId: track.id }) : addTrack.bind(null, tracklistId, { cid: track.contentCID })}
          />
        </div>
        <Tags track={track} />
      </article>
    )
  }
}

export default Track
