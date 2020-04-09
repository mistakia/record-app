import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { parseQueryString } from '@core/utils'
import { tracklistActions, getCurrentTracklistContact } from '@core/tracklists'
import { contactActions } from '@core/contacts'
import { taglistActions } from '@core/taglists'
import { getApp } from '@core/app'
import Tracklist from '@components/tracklist'
import PageLayout from '@layouts/page'
import Contact from '@components/contact'

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
    const { tags } = parseQueryString(this.props.location.search)
    this.props.loadTracks(logId, tags || '')
    this.props.loadTags(logId)
    this.props.loadContact(logId)
  }

  render () {
    const { logId } = this.props.match.params
    const { app, contact } = this.props

    const head = <Contact type='profile' contact={contact} />

    const showAdd = logId === app.address
    const body = <Tracklist showAdd={showAdd} />

    return (
      <PageLayout head={head} body={body} />
    )
  }
}

const mapStateToProps = createSelector(
  getApp,
  getCurrentTracklistContact,
  (app, contact) => ({ app, contact })
)

const mapDispatchToProps = {
  loadTracks: tracklistActions.loadTracks,
  loadContact: contactActions.loadContact,
  loadTags: taglistActions.loadTags
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TracksPage)
