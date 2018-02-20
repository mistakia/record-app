import React from 'react'
import { Provider } from 'react-redux'
import { ConnectedRouter } from 'connected-react-router'

import createStore from '@core/store'
import createHistory from '@core/history'
import App from '@views/app'

const history = createHistory()
const initialState = window.__INITIAL_STATE__
const store = createStore(initialState, history)

const Root = () => (
  <Provider store={store}>
    <ConnectedRouter history={history}>
      <App/>
    </ConnectedRouter>
  </Provider>
)

export default Root
