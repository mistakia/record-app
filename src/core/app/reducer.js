import { Record } from 'immutable'
import { appActions } from './actions'

const initialState = new Record({
  id: null,
  address: null,
  orbitdb: new Map(),
  ipfs: new Map(),
  isReplicating: false,
  isPending: true,
  privateKey: null
})

export function appReducer (state = initialState(), { payload, type }) {
  switch (type) {
    case appActions.SET_IDENTITY_FULFILLED:
    case appActions.INIT_APP:
      return state.merge({
        address: payload.orbitdb.address,
        isPending: false,
        ...payload
      })

    case appActions.SET_IDENTITY_PENDING:
      return state.merge({
        isPending: true
      })

    case appActions.SET_IDENTITY_FAILED:
      return state.merge({
        isPending: false
      })

    case appActions.CONTACTS_CONNECTED:
      return state.set('isReplicating', true)

    case appActions.CONTACTS_DISCONNECTED:
      return state.set('isReplicating', false)

    case appActions.GET_PRIVATE_KEY_FULFILLED:
      return state.set('privateKey', payload.privateKey)

    default:
      return state
  }
}
