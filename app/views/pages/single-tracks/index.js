import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import queryString from 'query-string'
import { shell } from 'electron'
import Button from '@material-ui/core/Button'
import StarIcon from '@material-ui/icons/Star'
import AddIcon from '@material-ui/icons/Add'
import WebIcon from '@material-ui/icons/Web'

import { tracklistActions, getCurrentTracklistLog } from '@core/tracklists'
import { logActions } from '@core/logs'
import { taglistActions } from '@core/taglists'
import { getApp } from '@core/app'
import { getHelp, helpActions } from '@core/help'
import Tracklist from '@components/tracklist'
import PageLayout from '@layouts/page'
import Log from '@components/log'
import { WIKI_URL } from '@core/constants'

export class SingleTracksPage extends React.Component {
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
    const { address } = this.props.match.params
    const { tags, query, sort, order } = queryString.parse(this.props.location.search)
    this.props.loadTracks({
      path: this.props.location.pathname,
      addresses: [address],
      sort,
      order,
      tags: (tags && !Array.isArray(tags)) ? [tags] : (tags || []),
      query
    })
    this.props.loadTags([address])
    this.props.loadLog(address)
  }

  render () {
    const { address } = this.props.match.params
    const { app, log, isMyTracksHelpVisible, toggleMyTracksHelp, loadNextTracks } = this.props

    const help = (
      <div>
        <div className='page__help-row'>
          <div className='page__help-lead'>Here you will see tracks that you've added to your library.</div>
        </div>
        <div className='page__help-row'>
          <StarIcon />
          <div>Add tracks from other libraries to your own.</div>
        </div>
        <div className='page__help-row'>
          <AddIcon />
          <div>Add tracks from your computer and from the internet.</div>
        </div>
        <div className='page__help-row'>
          <WebIcon />
          <div>Add tracks from other websites using the chrome extension.</div>
        </div>
        <Button onClick={shell.openExternal.bind(null, WIKI_URL)} size='medium'>Learn more</Button>
      </div>
    )

    const head = <Log type='profile' log={log} />

    const isMyTracklist = address === app.address
    const body = <Tracklist showAdd={isMyTracklist} loadNext={loadNextTracks} log={log} tracklistAddress={address} />

    return (
      <PageLayout
        help={isMyTracksHelpVisible && isMyTracklist && help}
        onHelpClose={toggleMyTracksHelp}
        head={head}
        body={body}
      />
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
    isMyTracksHelpVisible: help.isMyTracksHelpVisible
  })
)

const mapDispatchToProps = {
  loadTracks: tracklistActions.loadTracks,
  loadNextTracks: tracklistActions.loadNextTracks,
  loadLog: logActions.loadLog,
  loadTags: taglistActions.loadTags,
  toggleMyTracksHelp: helpActions.toggleMyTracksHelp
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SingleTracksPage)
