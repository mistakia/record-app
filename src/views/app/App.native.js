import React, { Component } from 'react'
import nodejs from 'nodejs-mobile-react-native'
import { Route, Switch } from 'react-router-native'
import { connect } from 'react-redux'
import RNFS from 'react-native-fs'
import {
  AppState,
  StyleSheet,
  View
} from 'react-native'

import Menu from '@components/Menu'
import { infoActions } from '@core/info'
import TracksPage from '@pages/tracks'
import HomePage from '@pages/home'
import ContactsPage from '@pages/contacts'

export class App extends Component {
  componentWillMount () {
    nodejs.start('main.js')
    nodejs.channel.send(RNFS.DocumentDirectoryPath)

    this.listenerRef = (msg) => {
      if (msg === 'ready') { this.props.init() }
    }
    nodejs.channel.addListener(
      'message',
      this.listenerRef,
      this
    )
  }

  componentWillUnmount () {
    if (this.listenerRef) { nodejs.channel.removeListener('message', this.listenerRef) }
  }

  componentDidMount () {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // nodejs.channel.send('resume')
      }
      if (state === 'background') {
        // nodejs.channel.send('suspend')
      }
    })
  }

  render () {
    return (
      <View style={styles.appContainer}>
        <Menu />
        <Switch>
          <Route exact path='/' component={HomePage} />
          <Route path='/tracks/:logId([0-9a-zA-Z\/]*)' component={TracksPage} />
          <Route path='/contacts/:logId([0-9a-zA-Z\/]*)' component={ContactsPage} />
        </Switch>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  appContainer: {
    ...StyleSheet.absoluteFillObject,
    top: 20,
    backgroundColor: '#f6f6f6'
  }
})

const mapDispatchToProps = {
  init: infoActions.init
}

export default connect(
  null,
  mapDispatchToProps
)(App)
