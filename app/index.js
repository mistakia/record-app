/* global process */

import 'v8-compile-cache'
import React, { Fragment } from 'react'
import { render } from 'react-dom'
import { AppContainer as ReactHotAppContainer } from 'react-hot-loader'
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch'
import 'whatwg-fetch'

import Root from '@views/root'

const { remote } = require('electron')
const processId = remote.getCurrentWebContents().getOSProcessId()
console.log(`process id: ${processId}`)

const AppContainer = process.env.PLAIN_HMR ? Fragment : ReactHotAppContainer

document.addEventListener('DOMContentLoaded', () =>
  render(
    <AppContainer>
      <Root />
    </AppContainer>,
    document.getElementById('root')
  )
)

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
