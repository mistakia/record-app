import { Map, List } from 'immutable'
import { dbActions } from '@core/db'


export const initialState = new Map({
  id: null,
  addresses: new List()
})

export function dbReducer(state = initialState, { payload, type }) {
  switch(type) {
    case dbActions.DB_INIT_FULFILLED:
      return state.withMutations(state => {
	state.set('id', payload.id)
	state.set('addresses', new List(payload.addresses))
      })
    default:
      return state
  }
}
