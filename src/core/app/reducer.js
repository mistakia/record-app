import { Record } from 'immutable'
import { appActions } from './actions'

const initialState = new Record({
  address: null,
  isReplicating: false
})

export function appReducer (state = initialState(), { payload, type }) {
  switch (type) {
    case appActions.INIT_APP:
      return state.merge(payload)

    case appActions.CONTACTS_CONNECTED:
      return state.set('isReplicating', true)

    case appActions.CONTACTS_DISCONNECTED:
      return state.set('isReplicating', false)

    default:
      return state
  }
}
