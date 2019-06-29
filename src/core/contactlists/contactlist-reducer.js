import { List } from 'immutable'

import {
  PEER_CONTACTLIST_ID,
  ALL_CONTACTLIST_ID
} from '@core/constants'
import { appActions } from '@core/app'
import { contactlistActions } from './actions'
import { Contactlist } from './contactlist'

export function contactlistReducer (state = new Contactlist(), {payload, type}) {
  switch (type) {
    case appActions.INIT_APP:
      return state.set('id', payload.address)

    case contactlistActions.FETCH_CONTACTS_FULFILLED:
    case contactlistActions.FETCH_PEER_CONTACTS_FULFILLED:
    case contactlistActions.FETCH_ALL_CONTACTS_FULFILLED:
      return state.withMutations(contactlist => {
        contactlist.merge({
          isPending: false,
          contactIds: mergeContactIds(contactlist.contactIds, payload.data)
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

// TODO: merge with mergeTrackIds
function mergeContactIds (contactIds, collection) {
  let ids = contactIds.toJS()
  let newIds = collection.reduce((list, contactData) => {
    if (ids.indexOf(contactData._id) === -1) list.push(contactData._id)
    return list
  }, [])

  return newIds.length ? new List(ids.concat(newIds)) : contactIds
}
