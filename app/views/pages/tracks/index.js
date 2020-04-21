import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import queryString from 'query-string'

import { tracklistActions, getCurrentTracklistLog } from '@core/tracklists'
import { logActions } from '@core/logs'
import { taglistActions } from '@core/taglists'
import { getApp } from '@core/app'
import Tracklist from '@components/tracklist'
import PageLayout from '@layouts/page'
import Log from '@components/log'

export class TracksPage extends React.Component {
  constructor (props) {
    super(props)
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
    const { logAddress } = this.props.match.params
    const { tags, query } = queryString.parse(this.props.location.search)
    this.props.loadTracks({
      logAddress,
      tags: (tags && !Array.isArray(tags)) ? [tags] : (tags || []),
      query
    })
    this.props.loadTags(logAddress)
    this.props.loadLog(logAddress)
  }

  render () {
    const { logAddress } = this.props.match.params
    const { app, log } = this.props

    const head = <Log type='profile' log={log} />

    const showAdd = logAddress === app.address
    const body = <Tracklist showAdd={showAdd} />

    return (
      <PageLayout head={head} body={body} />
    )
  }
}

const mapStateToProps = createSelector(
  getApp,
  getCurrentTracklistLog,
  (app, log) => ({ app, log })
)

const mapDispatchToProps = {
  loadTracks: tracklistActions.loadTracks,
  loadLog: logActions.loadLog,
  loadTags: taglistActions.loadTags
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TracksPage)
