import React from 'react'
import { connect } from 'react-redux'
import {
  Text,
  View
} from 'react-native'

import { tracklistActions } from '@core/tracklists'
import Tracklist from '@components/Tracklist'
import PageLayout from '@layouts/page'

export class TracksPage extends React.Component {
  componentWillMount () {
    // '/me' or proper orbitdb adadress
    const { logId } = this.props.match.params
    this.props.loadTracks(logId)
  }

  render () {
    const head = (
      <Text>Tracks</Text>
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
