import { Map } from 'immutable'

import {
  PEER_CONTACTLIST_ID,
  ALL_CONTACTLIST_ID
} from '@core/constants'
import { contactlistActions } from './actions'
import { contactlistReducer } from './contactlist-reducer'

export const initialState = new Map({
  currentContactlistId: null
})

export function contactlistsReducer (state = initialState, action) {
  const { payload } = action

  switch (action.type) {
    case contactlistActions.FETCH_CONTACTS_FULFILLED:
    case contactlistActions.FETCH_CONTACTS_PENDING:
    case contactlistActions.FETCH_PEER_CONTACTS_PENDING:
    case contactlistActions.FETCH_PEER_CONTACTS_FULFILLED:
    case contactlistActions.FETCH_ALL_CONTACTS_PENDING:
    case contactlistActions.FETCH_ALL_CONTACTS_FULFILLED:
      return state.set(
        payload.logId,
        contactlistReducer(state.get(payload.logId), action)
      )

    case contactlistActions.LOAD_CONTACTS:
      return state.merge({
        currentContactlistId: payload.logId,
        [payload.logId]: contactlistReducer(undefined, action)
      })

    case contactlistActions.LOAD_PEER_CONTACTS:
      return state.merge({
        [PEER_CONTACTLIST_ID]: contactlistReducer(undefined, action)
      })

    case contactlistActions.LOAD_ALL_CONTACTS:
      return state.merge({
        [ALL_CONTACTLIST_ID]: contactlistReducer(undefined, action)
      })

    default:
      return state
  }
}
