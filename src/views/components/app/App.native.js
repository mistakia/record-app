import React from 'react'
import nodejs from 'nodejs-mobile-react-native'
import { connect } from 'react-redux'
import RNFS from 'react-native-fs'
import {
  AppState,
  StyleSheet,
  View
} from 'react-native'

import Menu from '@components/Menu'
import Routes from '@views/routes'
import { infoActions } from '@core/info'

export class App extends React.Component {
  componentWillMount () {
    nodejs.start('main.js')
    const msg = {
      action: 'init',
      data: { docsPath: RNFS.DocumentDirectoryPath }
    }
    nodejs.channel.send(JSON.stringify(msg))

    this.listenerRef = (message) => {
      const msg = JSON.parse(message)
      console.log(msg)
      if (msg.action === 'ready') { this.props.init() }
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
        <Menu />
        <Routes />
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
