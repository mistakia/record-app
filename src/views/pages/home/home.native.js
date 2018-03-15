import React, { Component } from 'react'
import { createSelector } from 'reselect'
import { connect } from 'react-redux'
import {
  AppRegistry,
  AppState,
  StyleSheet,
  Text,
  View
} from 'react-native'

import { getOrbitId, dbActions } from '@core/db'
import LoadDB from '@components/load-db'

export class HomePage extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    const { orbitId } = this.props
    return (
      <View>
	<Text style={styles.welcome}>ORBIT ID: {orbitId}</Text>
	<LoadDB />
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

export default connect(
  mapStateToProps
)(HomePage)
