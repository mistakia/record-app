import React from 'react'

import './status.styl'

export default class Status extends React.Component {
  render () {
    const { peers } = this.props

    return (
      <div className='status'>
        <div className='status__peers'>
          {peers.length} {peers.length === 1 ? 'peer' : 'peers'}
        </div>
      </div>
    )
  }
}
