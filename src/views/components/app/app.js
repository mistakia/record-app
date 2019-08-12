import React from 'react'
import hotkeys from 'hotkeys-js'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { push } from 'react-router-redux'

import Menu from '@components/menu'
import Routes from '@views/routes'
import Player from '@components/player'
import { getApp } from '@core/app'
import ReplicationProgress from '@components/replication-progress'

import 'normalize.css'
import '@styles/normalize.css'
import '@styles/index.styl'
import './app.styl'

const { ipcRenderer } = window.require('electron')

class App extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      ipfs: ''
    }
  }

  componentWillMount () {
    this.listener = (event, message) => {
      // TODO: error handling
      this.props.init(message)
    }
    ipcRenderer.once('ready', this.listener)
    ipcRenderer.on('redux', (event, message) => {
      this.props.dispatch(message)
    })

    hotkeys('e', () => this.props.dispatch(push('/explore')))
    hotkeys('i', () => this.props.dispatch(push('/info')))
    hotkeys('t', () => {
      const { address } = this.props.app
      address && this.props.dispatch(push(`/tracks${address}`))
    })
  }

  render () {
    return (
      <main>
        <Menu />
        <Routes />
        <Player />
        <ReplicationProgress />
      </main>
    )
  }
}

const mapStateToProps = createSelector(
  getApp,
  (app) => ({ app })
)

export default connect(mapStateToProps)(App)
