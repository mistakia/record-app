import React from 'react'

import IconButton from '@components/icon-button'

import './track.styl'

class Track extends React.Component {
  render () {
    const { isPlaying, isSelected, pause, play, track } = this.props

    return (
      <article className='track'>
        <div className='track__play'>
          <IconButton
            icon={isPlaying ? 'pause' : 'play'}
            label={isPlaying ? 'Pause' : 'Play'}
            onClick={isPlaying ? pause : play}
          />
        </div>
        <div className='track__body'>
          <h2>{track.title}</h2>
          <p>{track.url}</p>
        </div>
        <div className='track__actions'>

        </div>
      </article>
    )
  }
}

export default Track
