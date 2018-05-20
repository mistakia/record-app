import React, { Component } from 'react'
import { createSelector } from 'reselect'
import { connect } from 'react-redux'
import {
  StyleSheet,
  Text,
  View
} from 'react-native'

import { getInfo, infoActions } from '@core/info'

export class HomePage extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    const { info } = this.props
    return (
      <View>
	<Text style={styles.welcome}>ID: {info.ipfs.id}</Text>
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
  getInfo,
  (info) => ({info})
)

export default connect(
  mapStateToProps
)(HomePage)
