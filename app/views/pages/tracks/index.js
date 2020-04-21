import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import queryString from 'query-string'
import { shell } from 'electron'

import { tracklistActions, getCurrentTracklistLog } from '@core/tracklists'
import { logActions } from '@core/logs'
import { taglistActions } from '@core/taglists'
import { getApp } from '@core/app'
import { getHelp, helpActions } from '@core/help'
import Icon from '@components/icon'
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
    const { app, log, isTrackHelpVisible, toggleTrackHelp } = this.props

    const help = (
      <div>
        <div className='page__help-row'>
          <div className='page__help-lead'>Here you will see tracks that you've added to your library.</div>
        </div>
        <div className='page__help-row'>
          <Icon name='star-solid' />
          <div>Add tracks from other libraries to your own.</div>
        </div>
        <div className='page__help-row'>
          <Icon name='add' />
          <div>Add tracks from your computer and from the internet.</div>
        </div>
        <div className='page__help-row'>
          <Icon name='website' />
          <div>Add tracks from other websites using the chrome extension.</div>
        </div>
        <a onClick={shell.openExternal.bind(null, 'https://github.com/mistakia/record-app/wiki')} className='button button__text page__help-link'>Learn more</a>
      </div>
    )

    const head = <Log type='profile' log={log} />

    const isMyTracklist = logAddress === app.address
    const body = <Tracklist showAdd={isMyTracklist} />

    return (
      <PageLayout
        help={isTrackHelpVisible && isMyTracklist && help}
        onHelpClose={toggleTrackHelp}
        head={head}
        body={body} />
    )
  }
}

const mapStateToProps = createSelector(
  getApp,
  getCurrentTracklistLog,
  getHelp,
  (app, log, help) => ({
    app,
    log,
    isTrackHelpVisible: help.isTrackHelpVisible
  })
)

const mapDispatchToProps = {
  loadTracks: tracklistActions.loadTracks,
  loadLog: logActions.loadLog,
  loadTags: taglistActions.loadTags,
  toggleTrackHelp: helpActions.toggleTrackHelp
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TracksPage)
