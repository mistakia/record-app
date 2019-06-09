import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import {
  playerActions,
  getPlayer,
  getPlayerTrack,
  getPlayerTracklistCursor
} from '@core/player'
import { audio } from '@core/audio'
import { Track } from '@core/tracks'
import { createShallowEqualSelector } from '@core/utils'

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
  getPlayer,
  getPlayerTrack,
  getPlayerTracklistCursor,
  (player, track, cursor) => ({
    decreaseVolume: audio.decreaseVolume,
    increaseVolume: audio.increaseVolume,
    isPlaying: player.isPlaying,
    isShuffling: player.isShuffling,
    isFullscreen: player.isFullscreen,
    nextTrackId: cursor.nextTrackId,
    pause: audio.pause,
    play: audio.play,
    previousTrackId: cursor.previousTrackId,
    track,
    tracklistId: player.tracklistId,
    volume: player.volume
  })
)

const mapDispatchToProps = {
  toggleFullscreen: playerActions.toggleFullscreen,
  select: playerActions.playSelectedTrack,
  shuffle: playerActions.shuffleTracklist
}

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { nextTrackId, previousTrackId, tracklistId, isShuffling } = stateProps

  if (isShuffling) {
    return Object.assign({}, ownProps, stateProps, {
      nextTrack: dispatchProps.shuffle.bind(null, tracklistId),
      previousTrack: null
    })
  }

  return Object.assign({}, ownProps, stateProps, {
    nextTrack: nextTrackId ? dispatchProps.select.bind(null, nextTrackId, tracklistId) : null,
    previousTrack: previousTrackId ? dispatchProps.select.bind(null, previousTrackId, tracklistId) : null
  })
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(Player)
