import { Map } from 'immutable'
import { ipfsActions } from '@core/ipfs'


export const initialState = new Map({
  id: null
})

export function ipfsReducer(state = initialState, {payload, type}) {
  switch(type) {
    case ipfsActions.IPFS_INIT_FULFILLED:
      return state.set('id', payload.id)
    default:
      return state
  }
}
