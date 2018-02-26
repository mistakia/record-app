import { Map } from 'immutable'
import { dbActions } from '@core/db'


export const initialState = new Map({
  id: null
})

export function dbReducer(state = initialState, { payload, type }) {
  switch(type) {
    case dbActions.DB_INIT_FULFILLED:
      return state.set('id', payload)
    default:
      return state
  }
}
