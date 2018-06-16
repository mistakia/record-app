import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getPlayerTimes, PlayerTimesState } from '@core/player'
import { audio } from '@core/audio'

import './audio-timeline.styl'

export class AudioTimeline extends React.Component {
  static propTypes = {
    seek: PropTypes.func.isRequred,
    times: PropTypes.instanceOf(PlayerTimesState).isRequired
  }

  constructor () {
    super(...arguments)
    this.handleClick = this.handleClick.bind(this)
  }

  handleClick (event) {
    const { currentTarget, pageX } = event
    const { seek, times } = this.props

    seek(
      (pageX - currentTarget.getBoundingClientRect().left) / currentTarget.offsetWidth * times.duration
    )
  }

  render () {
    let { bufferedTime, percentBuffered, percentCompleted } = this.props.times

    return (
      <div className='audio-timeline' onClick={this.handleClick}>
        <div className={'bar bar--buffered' + (bufferedTime > 0 && ' bar--animated')} style={{width: percentBuffered}} />
        <div className='bar bar--completed' style={{width: percentCompleted}} />
      </div>
    )
  }
}

const mapStateToProps = createSelector(
  getPlayerTimes,
  times => ({
    seek: audio.seek,
    times
  })
)

export default connect(mapStateToProps)(AudioTimeline)
