import React from 'react'
import { Provider } from 'react-redux'
import { withRouter } from 'react-router'
import { ConnectedRouter } from 'connected-react-router/immutable'

import createStore from '@core/store'
import history from '@core/history'
import App from '@components/app'

const initialState = window.__INITIAL_STATE__
const store = createStore(history, initialState)
const ConnectedApp = withRouter(App)

const Root = () => (
  <Provider store={store}>
    <ConnectedRouter history={history}>
      <ConnectedApp />
    </ConnectedRouter>
  </Provider>
)

export default Root
