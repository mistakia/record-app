import React from 'react'
import hotkeys from 'hotkeys-js'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { push } from 'react-router-redux'

import Menu from '@components/menu'
import Routes from '@views/routes'
import Player from '@components/player'
import Queue from '@components/queue'
import ContextMenu from '@components/context-menu'
import { contextMenuActions } from '@core/context-menu'
import { getApp } from '@core/app'
import Loading from '@components/loading'

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
    target.isContentEditable
    || ((tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') && !target.readOnly)
  ) {
    flag = false
  }
  return flag
}

class App extends React.Component {
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
    const { isPending } = this.props.app
    if (isPending) {
      return <Loading loading={isPending} />
    }

    return (
      <main>
        <Menu />
        <Routes />
        <Player />
        <Queue />
        <ContextMenu />
      </main>
    )
  }
}

const mapStateToProps = createSelector(
  getApp,
  (app) => ({ app })
)

export default connect(mapStateToProps)(App)
