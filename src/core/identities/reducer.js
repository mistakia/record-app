import { Map } from 'immutable'

import { identityActions } from './actions'
import { createIdentity } from './identity'

export const initialState = new Map({
  currentIdentity: null
})

export function identitiesReducer (state = initialState, {payload, type}) {
  switch(type) {

    case identityActions.FETCH_IDENTITY_FULFILLED:
      return state.withMutations(identities => {
	const { identity } = payload
	if (!identities.has(identity.id)) {
	  identities.set(identity.id, createIdentity(identity))
	}
      })

    case identityActions.LOAD_IDENTITY:
      return state.set('currentIdentity', payload.id)

    default:
      return state
  }
}
