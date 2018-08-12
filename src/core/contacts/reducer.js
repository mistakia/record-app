import { Map } from 'immutable'

import { contactlistActions } from '@core/contactlists'
import { feedActions } from '@core/feed'
import { createContact } from './contact'

export function contactsReducer (state = new Map(), {payload, type}) {
  switch (type) {
    case contactlistActions.FETCH_CONTACTS_FULFILLED:
      return state.withMutations(contacts => {
        payload.data.forEach(contactData => {
          contacts.set(contactData._id, createContact(contactData))
        })
      })

    case feedActions.FETCH_FEED_FULFILLED:
      return state.withMutations(contacts => {
        payload.data.forEach(feedData => {
          if (feedData.type === 'contact') {
            contacts.set(feedData.content._id, createContact(feedData.content))
          }

          contacts.set(feedData.contactId, createContact(feedData.contact))
        })
      })

    default:
      return state
  }
}
