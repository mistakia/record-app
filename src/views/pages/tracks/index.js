import React from 'react'
import { connect } from 'react-redux'

import { tracklistActions } from '@core/tracklists'

import render from './tracks'

export class TracksPage extends React.Component {
  componentWillMount () {
    this._load()
  }

  componentDidUpdate() {
    this._load()
  }

  _load () {
    // '/me' or proper orbitdb address
    const { logId } = this.props.match.params
    this.props.loadTracks(`/${logId}`)
  }

  render () {
    return render.call(this)
  }
}

const mapDispatchToProps = {
  loadTracks: tracklistActions.loadTracks
}

export default connect(
  null,
  mapDispatchToProps
)(TracksPage)
