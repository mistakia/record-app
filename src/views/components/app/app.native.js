import React from 'react'
import nodejs from 'nodejs-mobile-react-native'
import { connect } from 'react-redux'
import RNFS from 'react-native-fs'
import {
  AppState,
  StyleSheet,
  View
} from 'react-native'

import Menu from '@components/menu'
import ModalContainer from '@components/modal-container'
import Routes from '@views/routes'
import Player from '@components/player'
import { appActions } from '@core/app'

export class App extends React.Component {
  componentWillMount () {
    nodejs.start('bundle.js')
    const msg = {
      action: 'init',
      data: { docsPath: RNFS.DocumentDirectoryPath }
    }
    nodejs.channel.send(JSON.stringify(msg))

    this.listener = (message) => {
      const msg = JSON.parse(message)
      if (msg.action === 'ready') {
        // TODO: error handling
        this.props.init()
        nodejs.channel.removeListener('message', this.listener)
      }
    }
    nodejs.channel.addListener(
      'message',
      this.listener,
      this
    )
  }

  componentWillUnmount () {
    if (this.listener) { nodejs.channel.removeListener('message', this.listener) }
  }

  componentDidMount () {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        nodejs.channel.send(JSON.stringify({ action: 'resume' }))
      }
      if (state === 'background') {
        nodejs.channel.send(JSON.stringify({ action: 'suspend' }))
      }
    })
  }

  render () {
    return (
      <View style={styles.appContainer}>
        <View style={styles.mainContainer}>
          <Menu />
          <Routes />
          <Player />
        </View>
        <ModalContainer />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  appContainer: {
    ...StyleSheet.absoluteFillObject
  },
  mainContainer: {
    ...StyleSheet.absoluteFillObject,
    top: 20,
    paddingBottom: 52,
    backgroundColor: '#f6f6f6'
  }
})

const mapDispatchToProps = {
  init: appActions.initApp
}

export default connect(
  null,
  mapDispatchToProps
)(App)
