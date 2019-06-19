import React from 'react'
import { connect } from 'react-redux'

import Menu from '@components/menu'
import Routes from '@views/routes'
import Player from '@components/player'
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
  }

  render () {
    return (
      <main className='main scroll'>
        <Menu />
        <Routes />
        <Player />
        <ReplicationProgress />
      </main>
    )
  }
}

export default connect()(App)
