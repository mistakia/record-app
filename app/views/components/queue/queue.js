import React from 'react'
import { SortableContainer, SortableElement } from 'react-sortable-hoc'
import IconButton from '@material-ui/core/IconButton'
import PauseIcon from '@material-ui/icons/Pause'
import PlayArrowIcon from '@material-ui/icons/PlayArrow'
import CircularProgress from '@material-ui/core/CircularProgress'
import MoreVertIcon from '@material-ui/icons/MoreVert'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import CloseIcon from '@material-ui/icons/Close'

import FormattedTime from '@components/formatted-time'
import Artwork from '@components/artwork'

import './queue.styl'

class Queue extends React.Component {
  _handleClick (event, trackId) {
    const { showContext } = this.props
    showContext({
      id: 'track',
      data: { trackId },
      clickX: event.clientX,
      clickY: event.clientY
    })
  }

  render () {
    const {
      contextMenuTrackId,
      isQueueVisible,
      isPlaying,
      isLoading,
      tracks,
      track,
      playQueueTrack,
      playPlayerTracklistTrack,
      pause,
      play,
      toggleQueue,
      clearQueue,
      isShuffling,
      tracklistLog,
      tracklist,
      reorderQueue,
      reorderPlayerTracklist,
      playerTracklistTracks
    } = this.props

    if (!isQueueVisible) {
      return <div className='player__queue' />
    }
    const selectedTrackId = track.id

    const SortableItem = SortableElement(({ track, queueIndex, queue }) => {
      const isSelected = track.id === selectedTrackId
      const isTrackPlaying = isSelected && isPlaying
      const isTrackLoading = isSelected && isLoading
      const playTrack = isSelected ? play : (queue ? playQueueTrack.bind(null, queueIndex) : playPlayerTracklistTrack.bind(null, queueIndex))

      const classNames = ['queue__track']
      if (contextMenuTrackId === track.id) classNames.push('context-menu-visible')

      let artwork = track.thumbnail
      if (artwork && !track.haveTrack) {
        artwork += '?localOnly=true'
      }

      return (
        <article
          className={classNames.join(' ')}
          onContextMenu={(event) => this._handleClick(event, track.id)}>
          <IconButton
            onClick={isTrackPlaying ? pause : playTrack}
            disabled={isTrackLoading}
            className={isTrackPlaying ? 'queue__track-playing' : undefined}>
            {isTrackLoading ? <CircularProgress size={24} /> : (isTrackPlaying ? <PauseIcon /> : <PlayArrowIcon />)}
          </IconButton>
          <div className='queue__track-body'>
            <div className={`queue__track-title ${track.isLocal ? 'available' : ''}`}>{track.name}</div>
            <div className='queue__track-artist'>{track.artist}</div>
          </div>
          <IconButton onClick={(event) => this._handleClick(event, track.id)}>
            <MoreVertIcon />
          </IconButton>
          <small className='queue__track-duration'>
            <FormattedTime value={track.duration} unit={'ms'} />
          </small>
        </article>
      )
    })

    const SortableList = SortableContainer(({ items, queue }) => {
      return (
        <div>
          {items.map((track, index) => (
            <SortableItem key={`item-${track.id}-${index}`} index={index} queueIndex={index} track={track} queue={queue} />
          ))}
        </div>
      )
    })

    return (
      <div className='player__queue visible'>
        <IconButton onClick={toggleQueue}>
          <ExpandMoreIcon />
        </IconButton>
        <div className='player__queue-content'>
          <div className='player__queue-main'>
            <Artwork className='player__queue-artwork' url={track.thumbnail} background />
          </div>
          <div className='player__queue-side'>
            <div className='player__queue-header'>
              <div className='player__queue-header-title'>Playing next</div>
              {!!tracks.size &&
                <IconButton disabled={!tracks.size} onClick={clearQueue}>
                  <CloseIcon />
                </IconButton>}
            </div>
            <div className='player__queue-tracks'>
              <SortableList
                queue
                items={tracks}
                onSortEnd={reorderQueue}
                distance={1}
                helperClass='sortable__helper' />
              {!!playerTracklistTracks.size && !!tracks.size && <div className='player__queue-tracks-header'>
                <div className='player__queue-tracks-header-title'>Back To:</div>
                {isShuffling && 'Shuffling '}
                {tracklistLog ? tracklistLog.displayName : tracklist.path.substring(1)}
              </div>}
              <SortableList
                items={playerTracklistTracks}
                onSortEnd={reorderPlayerTracklist}
                distance={1}
                helperClass='sortable__helper' />
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default Queue
