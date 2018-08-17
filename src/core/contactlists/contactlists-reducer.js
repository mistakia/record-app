import { Map } from 'immutable'

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
      return state.set(
        payload.logId,
        contactlistReducer(state.get(payload.logId), action)
      )

    case contactlistActions.LOAD_CONTACTS:
      return state.merge({
        currentContactlistId: payload.logId,
        [payload.logId]: contactlistReducer(undefined, action)
      })

    default:
      return state
  }
}
