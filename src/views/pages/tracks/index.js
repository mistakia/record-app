import React from 'react'
import { connect } from 'react-redux'

import { parseQueryString } from '@core/utils'
import { tracklistActions } from '@core/tracklists'
import { taglistActions } from '@core/taglists'

import render from './tracks'

export class TracksPage extends React.Component {
  componentWillMount () {
    this._load()
  }

  componentDidUpdate (prevProps) {
    const location = JSON.stringify(this.props.location)
    const prevLocation = JSON.stringify(prevProps.location)
    if (location !== prevLocation) {
      this._load()
    }
  }

  _load () {
    // '/me' or proper orbitdb address
    const { logId } = this.props.match.params || 'me'
    const { tags } = parseQueryString(this.props.location.search)
    this.props.loadTracks(`/${logId}`, tags || '')
    this.props.loadTags(`/${logId}`)
  }

  render () {
    return render.call(this)
  }
}

const mapDispatchToProps = {
  loadTracks: tracklistActions.loadTracks,
  loadTags: taglistActions.loadTags
}

export default connect(
  null,
  mapDispatchToProps
)(TracksPage)
