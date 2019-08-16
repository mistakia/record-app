import React from 'react'

import './player-timeline.styl'

export default class PlayerTimeline extends React.Component {
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
      <div id='player-timeline' onClick={this.handleClick}>
        <div className={'bar bar--buffered' + (bufferedTime > 0 && ' bar--animated')} style={{width: percentBuffered}} />
        <div className='bar bar--completed' style={{width: percentCompleted}} />
      </div>
    )
  }
}
