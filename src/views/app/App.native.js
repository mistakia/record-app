import React, { Component } from 'react'
import nodejs from 'nodejs-mobile-react-native'
import { createSelector } from 'reselect'
import { Route } from 'react-router-dom'
import { connect } from 'react-redux'
import {
  AppRegistry,
  AppState,
  StyleSheet,
  Text,
  View
} from 'react-native'

import { getOrbitId, dbActions } from '@core/db'
import TracksPage from '@pages/tracks'

export class App extends Component {
  constructor(props) {
    super(props)
  }

  componentWillMount() {
    const self = this

    nodejs.start('main.js')
    this.listenerRef = ((msg) => {
      if (msg === 'ready')
	self.props.init()
    })
    nodejs.channel.addListener(
      'message',
      this.listenerRef,
      this
    )
  }

  componentWillUnmount() {
    if (this.listenerRef)
      nodejs.channel.removeListener('message', this.listenerRef)
  }

  componentDidMount() {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') {
	nodejs.channel.send('resume')
      }
      if (state === 'background') {
	nodejs.channel.send('suspend')
      }
    })
  }

  render() {
    return (
      <View>
	<Route exact path ='/' component={TracksPage} />
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
    margin: 10,
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
  init: dbActions.init
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App)
