import React from 'react'

import Menu from '@components/menu'
import Routes from '@views/routes'
import Player from '@components/player'

import 'normalize.css'
import '@styles/normalize.css'
import '@styles/index.styl'
import './app.styl'

const { ipcRenderer } = window.require('electron')

export default class App extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      ipfs: ''
    }
  }

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
