import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { parseQueryString } from '@core/utils'
import { tracklistActions } from '@core/tracklists'
import { profileActions } from '@core/profiles'
import { taglistActions } from '@core/taglists'
import { getApp } from '@core/app'
import Tracklist from '@components/tracklist'
import PageLayout from '@layouts/page'
import Profile from '@components/profile'

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
    const { logId } = this.props.match.params
    console.log(logId)
    const { tags } = parseQueryString(this.props.location.search)
    this.props.loadTracks(logId, tags || '')
    this.props.loadTags(logId)
    this.props.loadProfile(logId)
  }

  render () {
    const { logId } = this.props.match.params
    const { app } = this.props

    const head = <Profile />

    const showAdd = logId === app.address
    const body = <Tracklist showAdd={showAdd} />

    return (
      <PageLayout head={head} body={body} />
    )
  }
}

const mapStateToProps = createSelector(
  getApp,
  (app) => ({app})
)

const mapDispatchToProps = {
  loadTracks: tracklistActions.loadTracks,
  loadProfile: profileActions.loadProfile,
  loadTags: taglistActions.loadTags
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TracksPage)
