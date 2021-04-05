import { fromJS } from 'immutable'
import { applyMiddleware, compose, createStore } from 'redux'
import { routerMiddleware } from 'connected-react-router/immutable'
import createSagaMiddleware, { END } from 'redux-saga'

import rootSaga from './sagas'
import rootReducer from './reducers'

const sagaMiddleware = createSagaMiddleware()

export default (history, initialState = {}) => {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

  // ======================================================
  // Middleware Configuration
  // ======================================================
  const middlewares = [
    sagaMiddleware,
    routerMiddleware(history)
  ]

  // ======================================================
  // Store Enhancers
  // ======================================================
  const enhancers = [
    applyMiddleware(...middlewares)
  ]

  // ======================================================
  // Store Instantiation and HMR Setup
  // ======================================================
  const store = createStore(
    rootReducer(history),
    fromJS(initialState),
    composeEnhancers(...enhancers)
  )

  sagaMiddleware.run(rootSaga)
  store.close = () => store.dispatch(END)

  if (module.hot) {
    // Enable webpack hot module replacement for reducers
    module.hot.accept('./reducers', () => {
      const nextReducers = rootReducer(history)
      store.replaceReducer(nextReducers)
    })
  }

  return store
}
