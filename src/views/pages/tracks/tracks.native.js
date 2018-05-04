import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import {
  StyleSheet,
  Text,
  View
} from 'react-native'

import { getOrbitId } from '@core/db'
import { tracklistActions } from '@core/tracklists'
import Tracklist from '@components/Tracklist'

export class TracksPage extends React.Component {
  componentWillMount() {
    this.props.loadTracks('me')
  }

  render() {
    const { orbitId } = this.props
    return (
      <View>
	<Text style={styles.welcome}>ORBIT ID: {orbitId}</Text>	
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

const mapStateToProps = createSelector(
  getOrbitId,
  (orbitId) => ({orbitId})
)

const mapDispatchToProps = {
  loadTracks: tracklistActions.loadTracks
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TracksPage)
