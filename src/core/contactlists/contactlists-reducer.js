import { Map } from 'immutable'

import { contactlistActions } from './actions'
import { contactlistReducer } from './contactlist-reducer'
import { Contactlist } from './contactlist'

export const initialState = new Map({
  currentContactlistId: 'DEFAULT_CONTACTLSIT_ID',
  'DEFAULT_CONTACTLIST_ID': new Contactlist({id: 'DEFAULT_CONTACTLIST_ID', isNew: false})
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
        [payload.logId]: contactlistReducer(state.get(payload.logId), action)
      })

    default:
      return state
  }
}
