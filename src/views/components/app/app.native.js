import React from 'react'
import nodejs from 'nodejs-mobile-react-native'
import {
  Platform,
  StyleSheet,
  StatusBar,
  View,
  Text
} from 'react-native'

import Menu from '@components/menu'
import Routes from '@views/routes'
import Player from '@components/player'

const AppStatusBar = ({backgroundColor, ...props}) => (
  <View style={[styles.statusBar, { backgroundColor }]}>
    <StatusBar translucent backgroundColor={backgroundColor} {...props} barStyle='default' />
  </View>
)

export default class App extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      ipfs: 'Loading'
    }
  }

  componentWillMount () {
    nodejs.start('bundle.js')

    this.listener = (message) => {
      const msg = JSON.parse(message)
      switch (msg.action) {
        case 'ready':
          this.props.init(msg.data)
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

  render () {
    if (!this.props.app.address) {
      return (
        <View style={styles.appLoading}>
          <Text>{this.state.ipfs}</Text>
        </View>
      )
    }

    return (
      <View style={styles.appContainer}>
        <AppStatusBar backgroundColor='#f9f9f9' barStyle='light-content' />
        <Menu />
        <Routes />
        <Player />
      </View>
    )
  }
}

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight

const styles = StyleSheet.create({
  statusBar: {
    height: STATUSBAR_HEIGHT
  },
  appLoading: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  appContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingBottom: 50
  }
})
