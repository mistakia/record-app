import React from 'react'
import ReactDOM from 'react-dom'
import { AppContainer } from 'react-hot-loader'
import { browserHistory } from 'react-router'

import Root from '@views/root'

const rootElement = document.getElementById('root')

let render = () => {
  ReactDOM.render(
    <AppContainer>
      <Root/>
    </AppContainer>,
    rootElement
  )
}

// This code is excluded from production bundle
if (__DEV__) {
  if (module.hot) {
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

    // Hot Module Replacement API
    module.hot.accept('./views/root', () => {
      const NextApp = require('./views/root').default
      ReactDOM.render(
	<AppContainer>
	  <NextApp/>
	</AppContainer>,
	rootElement
      )
    })
  }
}

// ========================================================
// Go!
// ========================================================
render()
