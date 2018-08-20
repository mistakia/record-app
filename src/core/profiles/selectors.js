import { createSelector } from 'reselect'

import { Contact, getContacts } from '@core/contacts'

export function getCurrentProfile (state) {
  let profiles = state.get('profiles')
  let currentProfileId = profiles.get('currentProfileId')
  return profiles.get(currentProfileId)
}

export function getMyProfile (state) {
  let profiles = state.get('profiles')
  return profiles.get('/me')
}

export const getContactForMyProfile = createSelector(
  getMyProfile,
  (state) => getContacts(state),  // FIX for https://stackoverflow.com/questions/35240716/webpack-import-returns-undefined-depending-on-the-order-of-imports
  (myProfile, contacts) => {
    return contacts.get(myProfile && myProfile.contactId) || new Contact()
  }
)

export const getContactForCurrentProfile = createSelector(
  getCurrentProfile,
  (state) => getContacts(state), // FIX for https://stackoverflow.com/questions/35240716/webpack-import-returns-undefined-depending-on-the-order-of-imports
  (profile, contacts) => {
    return contacts.get(profile && profile.contactId) || new Contact()
  }
)
