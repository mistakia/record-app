import React from 'react'

export class TrackContextMenu extends React.Component {
  render () {
    const { queue, queueTrack, unqueueTrack, track, hide } = this.props
    const trackId = track.id
    const isQueued = queue.contains(trackId)

    return (
      <div>
        <div
          className='context-menu--option'
          onClick={() => queueTrack({ trackId, playNext: true }) && hide()}>
          Play next</div>
        <div
          className='context-menu--option'
          onClick={() => queueTrack({ trackId }) && hide()}>
          Add to queue</div>
        <div
          className={'context-menu--option' + (!isQueued ? ' disabled' : '')}
          onClick={isQueued ? () => unqueueTrack({ trackId }) && hide() : null}>
          Remove from queue</div>
      </div>
    )
  }
}

export default TrackContextMenu
