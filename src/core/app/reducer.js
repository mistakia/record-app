import { Record } from 'immutable'
import { appActions } from './actions'

const initialState = new Record({
  address: null
})

export function appReducer (state = initialState(), { payload, type }) {
  switch (type) {
    case appActions.INIT_APP:
      return state.set('address', payload)

    default:
      return state
  }
}
