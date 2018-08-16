import { Map } from 'immutable'
import { appActions } from './actions'

const initialState = new Map({
  loaded: false
})

export function appReducer (state = initialState, { payload, type }) {
  switch (type) {
    case appActions.INIT_APP:
      return state.set('loaded', true)

    default:
      return state
  }
}
