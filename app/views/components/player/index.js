import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import {
  playerActions,
  getPlayer,
  getPlayerIsLoading,
  getPlayerTrack,
  getPlayerTracklistCursor,
  getPlayerTracklistContact
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
  getPlayerTracklistContact,
  (app, player, isLoading, track, cursor, contact) => ({
    app,
    decreaseVolume: audio.decreaseVolume,
    increaseVolume: audio.increaseVolume,
    isPlaying: player.isPlaying,
    isShuffling: player.isShuffling,
    queue: player.queue,
    isPlayingFromQueue: player.isPlayingFromQueue,
    nextTrackId: cursor.nextTrackId,
    pause: audio.pause,
    play: audio.play,
    tags: player.tracklistTags.toJS(),
    query: player.tracklistQuery,
    previousTrackId: cursor.previousTrackId,
    track,
    isLoading,
    tracklistId: player.tracklistId,
    tracklistContact: contact,
    volume: player.volume
  })
)

const mapDispatchToProps = {
  playTrack: playerActions.playTrack,
  shuffle: playerActions.shuffleSelectedTracklist,
  add: tracklistActions.addTrack,
  remove: tracklistActions.removeTrack,
  loadTracks: tracklistActions.loadTracks,
  stopShuffle: playerActions.stopShuffle,
  showContext: contextMenuActions.show
}

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { nextTrackId, previousTrackId } = stateProps

  return Object.assign({}, ownProps, stateProps, dispatchProps, {
    nextTrack: nextTrackId ? dispatchProps.playTrack.bind(null, nextTrackId) : null,
    previousTrack: previousTrackId ? dispatchProps.playTrack.bind(null, previousTrackId) : null
  })
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(Player)
