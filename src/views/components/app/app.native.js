import React from 'react'
import nodejs from 'nodejs-mobile-react-native'
import RNFS from 'react-native-fs'
import {
  AppState,
  StyleSheet,
  View,
  Text
} from 'react-native'

import Menu from '@components/menu'
import Routes from '@views/routes'
import Player from '@components/player'

export default class App extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      ipfs: 'Loading'
    }
  }

  componentWillMount () {
    nodejs.start('bundle.js')
    const msg = {
      action: 'init',
      data: { docsPath: RNFS.DocumentDirectoryPath }
    }
    nodejs.channel.send(JSON.stringify(msg))

    this.listener = (message) => {
      const msg = JSON.parse(message)
      switch (msg.action) {
        case 'ready':
          this.props.init()
          return nodejs.channel.removeListener('message', this.listener)

        case 'ipfs:state':
          return this.setState({
            ipfs: msg.data
          })

        default:
          console.log(`Invalid action: ${msg.action}`)
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
    if (!this.props.app.loaded) {
      return (
        <View style={styles.appLoading}>
          <Text>{this.state.ipfs}</Text>
        </View>
      )
    }

    return (
      <View style={styles.appContainer}>
        <Menu />
        <Routes />
        <Player />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  appLoading: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  appContainer: {
    ...StyleSheet.absoluteFillObject,
    top: 20,
    paddingBottom: 50
  }
})
