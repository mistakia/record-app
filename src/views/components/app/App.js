import React from 'react'
import { connect } from 'react-redux'

import Menu from '@components/Menu'
import { appActions } from '@core/app'
import Routes from '@views/routes'
import Player from '@components/player'

import 'normalize.css'
import '@styles/normalize.css'
import '@styles/index.styl'
import './App.styl'

const { ipcRenderer } = window.require('electron')

export class App extends React.Component {
  componentWillMount () {
    this.listener = (event, message) => {
      // TODO: error handling
      this.props.init()
    }
    ipcRenderer.once('ready', this.listener)
  }

  render () {
    return (
      <main className='main scroll'>
        <Menu />
        <Routes />
        <Player />
      </main>
    )
  }
}

const mapDispatchToProps = {
  init: appActions.initApp
}

export default connect(
  null,
  mapDispatchToProps
)(App)
