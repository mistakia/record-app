/* global __DEV__ */

import React from 'react'
import ReactDOM from 'react-dom'
import { hot } from 'react-hot-loader'
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch'
import 'whatwg-fetch'

import Root from '@views/root'

const rootElement = document.getElementById('root')

const { remote } = require('electron')
const processId = remote.getCurrentWebContents().getOSProcessId()
console.log(`process id: ${processId}`)

let render = () => {
  const App = hot(module)(Root)
  ReactDOM.render(<App />, rootElement)
}

// This code is excluded from production bundle
if (__DEV__ && module.hot) {
  // Development render functions
  const renderApp = render
  const renderError = (error) => {
    const RedBox = require('redbox-react').default

    ReactDOM.render(<RedBox error={error} />, rootElement)
  }

  // Wrap render in try/catch
  render = () => {
    try {
      renderApp()
    } catch (error) {
      console.error(error)
      renderError(error)
    }
  }

  const { Menu, MenuItem } = remote

  let rightClickPosition = null

  const menu = new Menu()
  const menuItem = new MenuItem({
    label: 'Inspect Element',
    click: () => {
      remote.getCurrentWindow().inspectElement(rightClickPosition.x, rightClickPosition.y)
    }
  })
  menu.append(menuItem)

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    rightClickPosition = {x: e.x, y: e.y}
    menu.popup(remote.getCurrentWindow())
  }, false)
}

// ========================================================
// Go!
// ========================================================
render()
