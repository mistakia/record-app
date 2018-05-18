import { List } from 'immutable'

import { contactlistActions } from './actions'
import { Contactlist } from './contactlist'

export function contactlistReducer(state = new Contactlist(), {payload, type}) {
  switch(type) {
  case contactlistActions.FETCH_CONTACTS_FULFILLED:
    return state.withMutations(contactlist => {
      contactlist
	.merge({
	  isPending: false,
	  contactIds: mergeContactIds(contactlist.contactIds, payload.data)
	})
    })

  case contactlistActions.FETCH_CONTACTS_PENDING:
    return state.set('isPending', true)

  case contactlistActions.LOAD_CONTACTS:
    return state.isNew ? state.set('id', payload.logId) : state

  default:
    return state
  }
}

//TODO: merge with mergeTrackIds
function mergeContactIds(contactIds, collection) {
  let ids = contactIds.toJS()
  let newIds = collection.reduce((list, contactData) => {
    if (ids.indexOf(contactData._id) === -1) list.push(contactData._id)
    return list
  }, [])

  return newIds.length ? new List(ids.concat(newIds)) : contactIds
}
