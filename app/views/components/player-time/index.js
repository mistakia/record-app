import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getPlayerTrack } from '@core/player'
import { Track } from '@core/tracks'

import PlayerTime from './player-time'

PlayerTime.propTypes = {
  track: PropTypes.instanceOf(Track)
}

const mapStateToProps = createSelector(
  getPlayerTrack,
  (track) => ({ track })
)

export default connect(
  mapStateToProps
)(PlayerTime)
