import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import {
  StyleSheet,
  Text,
  View
} from 'react-native'

import { tracklistActions } from '@core/tracklists'
import Tracklist from '@components/Tracklist'

export class TracksPage extends React.Component {
  componentWillMount() {
    // '/me' or proper orbitdb adadress
    const { logId } = this.props.match.params
    this.props.loadTracks(logId)
  }

  render() {
    return (
      <View>
	<Text>Tracks Page</Text>
	<Tracklist />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 20,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
})

const mapDispatchToProps = {
  loadTracks: tracklistActions.loadTracks
}

export default connect(
  null,
  mapDispatchToProps
)(TracksPage)
