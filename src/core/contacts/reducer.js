import { Map } from 'immutable'

import { contactlistActions } from '@core/contactlists'
import { createContact } from './contact'

export function contactsReducer(state = new Map(), {payload, type}) {
  switch (type) {
  case contactlistActions.FETCH_CONTACTS_FULFILLED:
    return state.withMutations(contacts => {
      payload.data.forEach(contactData => {
	contacts.set(contactData._id, createContact(contactData))
      })
    })

  default:
    return state
  }
}
