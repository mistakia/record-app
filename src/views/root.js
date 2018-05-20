import React from 'react'
import { Provider } from 'react-redux'
import { withRouter } from 'react-router'
import { ConnectedRouter } from 'react-router-redux'

import createStore from '@core/store'
import createHistory from '@core/history'
import App from '@views/app'

const history = createHistory()
const initialState = window.__INITIAL_STATE__
const store = createStore(initialState, history)

const ConnectedApp = withRouter(App)

const Root = () => (
  <Provider store={store}>
    <ConnectedRouter history={history}>
      <ConnectedApp />
    </ConnectedRouter>
  </Provider>
)

export default Root
