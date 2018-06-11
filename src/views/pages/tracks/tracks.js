import React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'

import { tracklistActions } from '@core/tracklists'
import Tracklist from '@components/Tracklist'
import PageLayout from '@layouts/page'

export class TracksPage extends React.Component {
  componentWillMount () {
    // '/me' or proper orbitdb address
    const { logId } = this.props.match.params
    this.props.loadTracks(logId)
  }

  render () {
    const { logId } = this.props.match.params
    const head = (
      <div>
        <h1>Tracks</h1>
        { logId === 'me' && <Link className='button' to='/tracks/new'>Add Track</Link> }
      </div>
    )

    const body = (
      <Tracklist />
    )

    return (
      <PageLayout head={head} body={body} />
    )
  }
}

const mapDispatchToProps = {
  loadTracks: tracklistActions.loadTracks
}

export default connect(
  null,
  mapDispatchToProps
)(TracksPage)
