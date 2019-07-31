import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import {
  playerActions,
  getPlayer,
  getPlayerIsLoading,
  getPlayerTrack,
  getPlayerTracklistCursor
} from '@core/player'
import { audio } from '@core/audio'
import { Track } from '@core/tracks'
import { getApp } from '@core/app'
import { createShallowEqualSelector } from '@core/utils'
import { tracklistActions } from '@core/tracklists'

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
  (app, player, isLoading, track, cursor) => ({
    app,
    decreaseVolume: audio.decreaseVolume,
    increaseVolume: audio.increaseVolume,
    isPlaying: player.isPlaying,
    isShuffling: player.isShuffling,
    nextTrackId: cursor.nextTrackId,
    pause: audio.pause,
    play: audio.play,
    previousTrackId: cursor.previousTrackId,
    track,
    isLoading,
    tracklistId: player.tracklistId,
    volume: player.volume
  })
)

const mapDispatchToProps = {
  select: playerActions.playSelectedTrack,
  shuffle: playerActions.shuffleTracklist,
  add: tracklistActions.addTrack,
  remove: tracklistActions.removeTrack
}

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { nextTrackId, previousTrackId, tracklistId, isShuffling } = stateProps

  if (isShuffling) {
    return Object.assign({}, ownProps, stateProps, dispatchProps, {
      nextTrack: dispatchProps.shuffle.bind(null, tracklistId),
      previousTrack: null
    })
  }

  return Object.assign({}, ownProps, stateProps, dispatchProps, {
    nextTrack: nextTrackId ? dispatchProps.select.bind(null, nextTrackId, tracklistId) : null,
    previousTrack: previousTrackId ? dispatchProps.select.bind(null, previousTrackId, tracklistId) : null
  })
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(Player)
