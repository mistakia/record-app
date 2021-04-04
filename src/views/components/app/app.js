import React from 'react'
import hotkeys from 'hotkeys-js'
import { push } from 'react-router-redux'
import CircularProgress from '@material-ui/core/CircularProgress'

import Menu from '@components/menu'
import Routes from '@views/routes'
import Player from '@components/player'
import Queue from '@components/queue'
import ContextMenu from '@components/context-menu'
import { contextMenuActions } from '@core/context-menu'
import Notification from '@components/notification'
import Dialog from '@components/dialog'

import 'normalize.css'
import '@styles/normalize.css'
import '@styles/index.styl'
import './app.styl'

const { ipcRenderer } = require('electron')

// do not filter out esc shortcut when focused on inputs etc
hotkeys.filter = (event) => {
  const key = event.keyCode || event.which || event.charCode
  if (key === 27) return true

  const target = event.target || event.srcElement
  const { tagName } = target
  let flag = true
  // ignore: isContentEditable === 'true', <input> and <textarea> when readOnly state is false, <select>
  if (
    target.isContentEditable ||
      ((tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') && !target.readOnly)
  ) {
    flag = false
  }
  return flag
}

export default class App extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      ipfs: ''
    }

    this.listener = (event, message) => {
      // TODO: error handling
      this.props.init(message)
    }
    ipcRenderer.once('ready', this.listener)
    ipcRenderer.on('redux', (event, message) => {
      this.props.dispatch(message)
    })

    hotkeys('esc', () => this.props.dispatch(contextMenuActions.hide()))
    hotkeys('h', () => this.props.dispatch(push('/explore')))
    hotkeys('a', () => this.props.dispatch(push('/account')))
    hotkeys('s', () => this.props.dispatch(push('/settings')))
    hotkeys('l', () => {
      const { address } = this.props.app
      address && this.props.dispatch(push(`/tracks${address}`))
    })
  }

  render () {
    const { app, playerOpen } = this.props
    if (app.isPending) {
      return <div className='app-loading-container'><CircularProgress /></div>
    }

    const classNames = []
    if (playerOpen) classNames.push('player-open')

    return (
      <main className={classNames.join(' ')}>
        <Menu />
        <Routes />
        <Player />
        <Queue />
        <Notification />
        <ContextMenu />
        <Dialog />
      </main>
    )
  }
}
