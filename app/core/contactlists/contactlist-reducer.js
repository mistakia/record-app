import {
  PEER_CONTACTLIST_ID,
  ALL_CONTACTLIST_ID
} from '@core/constants'
import { contactlistActions } from './actions'
import { contactActions } from '@core/contacts'
import { Contactlist } from './contactlist'
import { mergeIds } from '@core/utils'

export function contactlistReducer (state = new Contactlist(), {payload, type}) {
  switch (type) {
    case contactlistActions.FETCH_CONTACTS_FULFILLED:
    case contactlistActions.FETCH_PEER_CONTACTS_FULFILLED:
    case contactlistActions.FETCH_ALL_CONTACTS_FULFILLED:
      return state.withMutations(contactlist => {
        contactlist.merge({
          isPending: false,
          contactIds: mergeIds(contactlist.contactIds, payload.data)
        })
      })

    case contactActions.CONTACT_LOADED:
      return state.withMutations(contactlist => {
        contactlist.merge({
          contactIds: mergeIds(contactlist.contactIds, [payload.contact])
        })
      })

    case contactlistActions.FETCH_CONTACTS_PENDING:
    case contactlistActions.FETCH_PEER_CONTACTS_PENDING:
    case contactlistActions.FETCH_ALL_CONTACTS_PENDING:
      return state.set('isPending', true)

    case contactlistActions.LOAD_CONTACTS:
      return state.set('id', payload.logId)

    case contactlistActions.LOAD_PEER_CONTACTS:
      return state.set('id', PEER_CONTACTLIST_ID)

    case contactlistActions.LOAD_ALL_CONTACTS:
      return state.set('id', ALL_CONTACTLIST_ID)

    default:
      return state
  }
}
