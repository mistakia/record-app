import { createSelector } from 'reselect'

import { getContacts } from '@core/contacts'

export function getContactlists(state) {
  return state.get('contactlists')
}

export function getCurrentContactlist(state) {
  let contactlists = getContactlists(state)
  return contactlists.get(contactlists.get('currentContactlistId'))
}

export const getCurrentContactIds = createSelector(
  getCurrentContactlist,
  contactlist => contactlist.contactIds
)

export const getContactsForCurrentContactlist = createSelector(
  getCurrentContactIds,
  getContacts,
  (contactIds, contacts) => {
    return contactIds.map(id => contacts.get(id))
  }
)
