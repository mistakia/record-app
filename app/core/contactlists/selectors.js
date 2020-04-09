import { createSelector } from 'reselect'

import {
  PEER_CONTACTLIST_ID,
  ALL_CONTACTLIST_ID
} from '@core/constants'
import { getApp } from '@core/app'
import { getContacts, getContactByAddress, Contact } from '@core/contacts'
import { Contactlist } from './contactlist'

export function getContactlists (state) {
  return state.get('contactlists')
}

export function getContactlistById (state, logId) {
  return getContactlists(state).get(logId)
}

export function getCurrentContactlistId (state) {
  let contactlists = getContactlists(state)
  return contactlists.get('currentContactlistId')
}

export function getCurrentContactlist (state) {
  let contactlists = getContactlists(state)
  return contactlists.get(contactlists.get('currentContactlistId')) || new Contactlist()
}

export function getCurrentContactlistContact (state) {
  const logId = getCurrentContactlistId(state)
  if (!logId) {
    return new Contact()
  }
  return getContactByAddress(state, logId)
}

export function getPeerContactlist (state) {
  let contactlists = getContactlists(state)
  return contactlists.get(PEER_CONTACTLIST_ID) || new Contactlist()
}

export function getAllContactlist (state) {
  let contactlists = getContactlists(state)
  return contactlists.get(ALL_CONTACTLIST_ID) || new Contactlist()
}

export function getMyContactlistIsUpdating (state) {
  const { address } = getApp(state)
  const myContactList = getContactlistById(state, address)
  return myContactList ? myContactList.isUpdating : null
}

export const getCurrentContactIds = createSelector(
  getCurrentContactlist,
  contactlist => contactlist.contactIds
)

export const getPeerContactIds = createSelector(
  getPeerContactlist,
  contactlist => contactlist.contactIds
)

export const getAllContactIds = createSelector(
  getAllContactlist,
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

export const getContactsForAllContactlist = createSelector(
  getAllContactIds,
  getContacts,
  (contactIds, contacts) => {
    return contactIds.map(id => contacts.get(id))
  }
)
