import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import {
  playerActions,
  getPlayer,
  getPlayerIsLoading,
  getPlayerTrack,
  getPlayerTracklistCursor,
  getPlayerTracklistLog
} from '@core/player'
import { audio } from '@core/audio'
import { Track } from '@core/tracks'
import { getApp } from '@core/app'
import { createShallowEqualSelector } from '@core/utils'
import { tracklistActions } from '@core/tracklists'
import { contextMenuActions } from '@core/context-menu'

import Player from './player'

Player.propTypes = {
  decreaseVolume: PropTypes.func.isRequired,
  increaseVolume: PropTypes.func.isRequired,
  isPlaying: PropTypes.bool.isRequired,
  nextTrack: PropTypes.func,
  pause: PropTypes.func.isRequired,
  play: PropTypes.func.isRequired,
  previousTrack: PropTypes.func,
  track: PropTypes.instanceOf(Track),
  volume: PropTypes.number.isRequired
}

const mapStateToProps = createShallowEqualSelector(
  getApp,
  getPlayer,
  getPlayerIsLoading,
  getPlayerTrack,
  getPlayerTracklistCursor,
  getPlayerTracklistLog,
  (app, player, isLoading, track, cursor, log) => ({
    app,
    decreaseVolume: audio.decreaseVolume,
    increaseVolume: audio.increaseVolume,
    isPlaying: player.isPlaying,
    isShuffling: player.isShuffling,
    isQueueVisible: player.isQueueVisible,
    queue: player.queue,
    nextTrackId: cursor.nextTrackId,
    pause: audio.pause,
    play: audio.play,
    repeat: player.repeat,
    tags: player.tracklistTags.toJS(),
    query: player.tracklistQuery,
    previousTrackId: cursor.previousTrackId,
    track,
    isLoading,
    tracklistAddress: player.tracklistAddress,
    tracklistLog: log,
    volume: player.volume
  })
)

const mapDispatchToProps = {
  playTrack: playerActions.playTrack,
  playPrevious: playerActions.playPrevious,
  playNext: playerActions.playNext,
  shuffle: playerActions.shuffleSelectedTracklist,
  add: tracklistActions.addTrack,
  remove: tracklistActions.removeTrack,
  loadTracks: tracklistActions.loadTracks,
  stopShuffle: playerActions.stopShuffle,
  showContext: contextMenuActions.show,
  toggleQueue: playerActions.toggleQueue,
  toggleRepeat: playerActions.togglePlayRepeat
}

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { nextTrackId, previousTrackId, tracklistPreviousTrackId } = stateProps

  return Object.assign({}, ownProps, stateProps, dispatchProps, {
    nextTrack: nextTrackId ? dispatchProps.playNext.bind(null, nextTrackId) : null,
    previousTrack: previousTrackId ? dispatchProps.playPrevious.bind(null, previousTrackId, tracklistPreviousTrackId) : null
  })
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(Player)
