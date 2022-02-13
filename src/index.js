/* global process */

import 'v8-compile-cache'
import React from 'react'
import { render } from 'react-dom'
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch'
import 'whatwg-fetch'

import log from './logger'
import Root from '@views/root'

const { remote } = require('electron')
const processId = remote.getCurrentWebContents().getOSProcessId()
log.info(`[app][ui] process id: ${processId}`)

if (process.env.NODE_ENV === 'production') {
  console.log = log.info.bind(log)
  console.error = log.error.bind(log)
}

document.addEventListener('DOMContentLoaded', () =>
  render(
    <Root />,
    document.getElementById('root')
  )
)

if (process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  const debugMenu = require('debug-menu')
  debugMenu.install()
}

/* let render = () => {
 *   const App = hot(module)(Root)
 *   ReactDOM.render(<App />, rootElement)
 * }
 *
 * // This code is excluded from production bundle
 * if (__DEV__ && module.hot) {
 *   // Development render functions
 *   const renderApp = render
 *   const renderError = (error) => {
 *     const RedBox = require('redbox-react').default
 *
 *     ReactDOM.render(<RedBox error={error} />, rootElement)
 *   }
 *
 *   // Wrap render in try/catch
 *   render = () => {
 *     try {
 *       renderApp()
 *     } catch (error) {
 *       console.error(error)
 *       renderError(error)
 *     }
 *   }
 *
 * }
 *
 * // ========================================================
 * // Go!
 * // ========================================================
 * render() */
