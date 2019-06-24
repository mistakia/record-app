import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getPlayerTimes, PlayerTimesState } from '@core/player'
import { audio } from '@core/audio'

import PlayerTimeline from './player-timeline'

PlayerTimeline.propTypes = {
  seek: PropTypes.func.isRequired,
  times: PropTypes.instanceOf(PlayerTimesState).isRequired
}

const mapStateToProps = createSelector(
  getPlayerTimes,
  times => ({
    seek: audio.seek,
    times
  })
)

export default connect(mapStateToProps)(PlayerTimeline)
