import React from 'react'

export class TrackContextMenu extends React.Component {
  render () {
    const {
      queue,
      queueTrack,
      unqueueTrack,
      hide,
      contextMenuInfo,
      showContext
    } = this.props
    const { trackId, clickX, clickY } = contextMenuInfo
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
        <div
          className={'context-menu--option'}
          onClick={() => setImmediate(() => showContext({ id: 'tag', trackId, clickX, clickY }))}>
          Add Tag</div>
      </div>
    )
  }
}

export default TrackContextMenu
