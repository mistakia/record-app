import React from 'react'
import { connect } from 'react-redux'
import {
  Text,
  View
} from 'react-native'

import { tracklistActions } from '@core/tracklists'
import Tracklist from '@components/Tracklist'

export class TracksPage extends React.Component {
  componentWillMount () {
    // '/me' or proper orbitdb adadress
    const { logId } = this.props.match.params
    this.props.loadTracks(logId)
  }

  render () {
    return (
      <View>
        <Text>Tracks Page</Text>
        <Tracklist />
      </View>
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
