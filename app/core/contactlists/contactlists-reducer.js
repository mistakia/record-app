import { Map } from 'immutable'

import {
  PEER_CONTACTLIST_ID,
  ALL_CONTACTLIST_ID
} from '@core/constants'
import { contactlistActions } from './actions'
import { contactlistReducer } from './contactlist-reducer'
import { contactActions } from '@core/contacts'

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

    case contactActions.CONTACT_LOADED:
      return state.set(
        ALL_CONTACTLIST_ID,
        contactlistReducer(state.get(ALL_CONTACTLIST_ID), action)
      )

    case contactlistActions.POST_CONTACT_FAILED:
    case contactlistActions.POST_CONTACT_FULFILLED:
      return state.setIn([payload.logId, 'isUpdating'], false)

    case contactlistActions.POST_CONTACT_PENDING:
      return state.setIn([payload.logId, 'isUpdating'], true)

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
