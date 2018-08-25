import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import {
  playerActions,
  getPlayer,
  getPlayerTrack
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
  (player, track, cursor) => ({
    decreaseVolume: audio.decreaseVolume,
    increaseVolume: audio.increaseVolume,
    isPlaying: player.isPlaying,
    isFullscreen: player.isFullscreen,
    pause: audio.pause,
    play: audio.play,
    track,
    tracklistId: player.tracklistId,
    volume: player.volume
  })
)

const mapDispatchToProps = {
  toggleFullscreen: playerActions.toggleFullscreen,
  select: playerActions.playSelectedTrack
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Player)
