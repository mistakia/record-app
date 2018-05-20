import React, { Component } from 'react'
import nodejs from 'nodejs-mobile-react-native'
import { Link, Route, Switch } from 'react-router-native'
import { connect } from 'react-redux'
import {
  AppState,
  Text,
  View
} from 'react-native'

import { infoActions } from '@core/info'
import TracksPage from '@pages/tracks'
import HomePage from '@pages/home'
import ContactsPage from '@pages/contacts'

export class App extends Component {
  componentWillMount () {
    const self = this

    nodejs.start('main.js')
    this.listenerRef = (msg) => {
      if (msg === 'ready') { self.props.init() }
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
        nodejs.channel.send('resume')
      }
      if (state === 'background') {
        nodejs.channel.send('suspend')
      }
    })
  }

  render () {
    return (
      <View>
        <View>
          <Link to='/'>
            <Text>Home</Text>
          </Link>
          <Link to='/tracks/me'>
            <Text>My Tracks</Text>
          </Link>
          <Link to='/contacts/me'>
            <Text>My Contacts</Text>
          </Link>
        </View>
        <Switch>
          <Route exact path='/' component={HomePage} />
          <Route path='/tracks/:logId([0-9a-zA-Z\/]*)' component={TracksPage} />
          <Route path='/contacts/:logId([0-9a-zA-Z\/]*)' component={ContactsPage} />
        </Switch>
      </View>
    )
  }
}

const mapDispatchToProps = {
  init: infoActions.init
}

export default connect(
  null,
  mapDispatchToProps
)(App)
