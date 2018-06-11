import React from 'react'
import { connect } from 'react-redux'
import { View, Text } from 'react-native'
import { Link } from 'react-router-native'

import { tracklistActions } from '@core/tracklists'
import Tracklist from '@components/Tracklist'
import PageLayout from '@layouts/page'
import headStyles from '@styles/head'

export class TracksPage extends React.Component {
  componentWillMount () {
    // '/me' or proper orbitdb adadress
    const { logId } = this.props.match.params
    this.props.loadTracks(`/${logId}`)
  }

  render () {
    const { logId } = this.props.match.params
    const head = (
      <View style={headStyles.content}>
        <Text>Tracks</Text>
        {logId === 'me' && <Link style={headStyles.button} to='/tracks/new'>
          <Text>Add Track</Text>
        </Link>}
      </View>
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
