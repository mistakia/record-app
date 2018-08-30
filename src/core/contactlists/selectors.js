import { createSelector } from 'reselect'

import {
  PEER_CONTACTLIST_ID,
  SUGGESTED_CONTACTLIST_ID
} from '@core/constants'
import { getContacts } from '@core/contacts'
import { Contactlist } from './contactlist'

export function getContactlists (state) {
  return state.get('contactlists')
}

export function getCurrentContactlist (state) {
  let contactlists = getContactlists(state)
  return contactlists.get(contactlists.get('currentContactlistId')) || new Contactlist()
}

export function getPeerContactlist (state) {
  let contactlists = getContactlists(state)
  return contactlists.get(PEER_CONTACTLIST_ID) || new Contactlist()
}

export function getSuggestedContactlist (state) {
  let contactlists = getContactlists(state)
  return contactlists.get(SUGGESTED_CONTACTLIST_ID) || new Contactlist()
}

export const getCurrentContactIds = createSelector(
  getCurrentContactlist,
  contactlist => contactlist.contactIds
)

export const getPeerContactIds = createSelector(
  getPeerContactlist,
  contactlist => contactlist.contactIds
)

export const getSuggestedContactIds = createSelector(
  getSuggestedContactlist,
  contactlist => contactlist.contactIds
)

export const getContactsForCurrentContactlist = createSelector(
  getCurrentContactIds,
  getContacts,
  (contactIds, contacts) => {
    return contactIds.map(id => contacts.get(id))
  }
)

export const getContactsForPeerContactlist = createSelector(
  getPeerContactIds,
  getContacts,
  (contactIds, contacts) => {
    return contactIds.map(id => contacts.get(id))
  }
)

export const getContactsForSuggestedContactlist = createSelector(
  getSuggestedContactIds,
  getContacts,
  (contactIds, contacts) => {
    return contactIds.map(id => contacts.get(id))
  }
)
