export const contactlistActions = {
  FETCH_CONTACTS_FAILED: 'FETCH_CONTACTS_FAILED',
  FETCH_CONTACTS_FULFILLED: 'FETCH_CONTACTS_FULFILLED',
  FETCH_CONTACTS_PENDING: 'FETCH_CONTACTS_PENDING',

  LOAD_CONTACTS: 'LOAD_CONTACTS',

  POST_CONTACT_FAILED: 'POST_CONTACT_FAILED',
  POST_CONTACT_FULFILLED: 'POST_CONTACT_FULFILLED',
  POST_CONTACT_PENDING: 'POST_CONTACT_PENDING',

  ADD_CONTACT: 'ADD_CONTACT',

  DELETE_CONTACT_FAILED: 'DELETE_CONTACT_FAILED',
  DELETE_CONTACT_FULFILLED: 'DELETE_CONTACT_FULFILLED',
  DELETE_CONTACT_PENDING: 'DELETE_CONTACT_PENDING',

  REMOVE_CONTACT: 'REMOVE_CONTACT',

  LOAD_SUGGESTED_CONTACTS: 'LOAD_SUGGESTED_CONTACTS',

  FETCH_SUGGESTED_CONTACTS_FAILED: 'FETCH_SUGGESTED_CONTACTS_FAILED',
  FETCH_SUGGESTED_CONTACTS_FULFILLED: 'FETCH_SUGGESTED_CONTACTS_FULFILLED',
  FETCH_SUGGESTED_CONTACTS_PENDING: 'FETCH_SUGGESTED_CONTACTS_PENDING',

  LOAD_PEER_CONTACTS: 'LOAD_PEER_CONTACTS',

  FETCH_PEER_CONTACTS_FAILED: 'FETCH_PEER_CONTACTS_FAILED',
  FETCH_PEER_CONTACTS_FULFILLED: 'FETCH_PEER_CONTACTS_FULFILLED',
  FETCH_PEER_CONTACTS_PENDING: 'FETCH_PEER_CONTACTS_PENDING',

  fetchContactsFailed: error => ({
    type: contactlistActions.FETCH_CONTACTS_FAILED,
    payload: error
  }),

  fetchContactsFulfilled: (logId, data) => ({
    type: contactlistActions.FETCH_CONTACTS_FULFILLED,
    payload: {
      data,
      logId
    }
  }),

  fetchContactsPending: logId => ({
    type: contactlistActions.FETCH_CONTACTS_PENDING,
    payload: {
      logId
    }
  }),

  loadContacts: logId => ({
    type: contactlistActions.LOAD_CONTACTS,
    payload: {
      logId
    }
  }),

  postContactFailed: error => ({
    type: contactlistActions.POST_CONTACT_FAILED,
    payload: error
  }),

  postContactFulfilled: (logId, data) => ({
    type: contactlistActions.POST_CONTACT_FULFILLED,
    payload: {
      logId,
      data
    }
  }),

  postContactPending: logId => ({
    type: contactlistActions.POST_CONTACT_PENDING,
    payload: {
      logId
    }
  }),

  addContact: (logId, data) => ({
    type: contactlistActions.ADD_CONTACT,
    payload: {
      logId,
      data
    }
  }),

  removeContact: (data) => ({
    type: contactlistActions.REMOVE_CONTACT,
    payload: {
      data
    }
  }),

  deleteContactFailed: error => ({
    type: contactlistActions.DELETE_CONTACT_FAILED,
    payload: error
  }),

  deleteContactFulfilled: (logId, data) => ({
    type: contactlistActions.DELETE_CONTACT_FULFILLED,
    payload: {
      logId,
      data
    }
  }),

  deleteContactPending: logId => ({
    type: contactlistActions.DELETE_CONTACT_PENDING,
    payload: {
      logId
    }
  }),

  loadSuggested: () => ({
    type: contactlistActions.LOAD_SUGGESTED_CONTACTS
  }),

  fetchSuggestedContactsFailed: error => ({
    type: contactlistActions.FETCH_SUGGESTED_CONTACTS_FAILED,
    payload: error
  }),

  fetchSuggestedContactsFulfilled: (logId, data) => ({
    type: contactlistActions.FETCH_SUGGESTED_CONTACTS_FULFILLED,
    payload: {
      data,
      logId
    }
  }),

  fetchSuggestedContactsPending: logId => ({
    type: contactlistActions.FETCH_SUGGESTED_CONTACTS_PENDING,
    payload: {
      logId
    }
  }),

  loadPeers: () => ({
    type: contactlistActions.LOAD_PEER_CONTACTS
  }),

  fetchPeerContactsFailed: error => ({
    type: contactlistActions.FETCH_PEER_CONTACTS_FAILED,
    payload: error
  }),

  fetchPeerContactsFulfilled: (logId, data) => ({
    type: contactlistActions.FETCH_PEER_CONTACTS_FULFILLED,
    payload: {
      data,
      logId
    }
  }),

  fetchPeerContactsPending: logId => ({
    type: contactlistActions.FETCH_PEER_CONTACTS_PENDING,
    payload: {
      logId
    }
  })
}

export const contactlistRequestActions = {
  failed: contactlistActions.fetchContactsFailed,
  fulfilled: contactlistActions.fetchContactsFulfilled,
  pending: contactlistActions.fetchContactsPending
}

export const contactlistPostActions = {
  failed: contactlistActions.postContactFailed,
  fulfilled: contactlistActions.postContactFulfilled,
  pending: contactlistActions.postContactPending
}

export const contactlistDeleteActions = {
  failed: contactlistActions.deleteContactFailed,
  fulfilled: contactlistActions.deleteContactFulfilled,
  pending: contactlistActions.deleteContactPending
}

export const suggestedContactlistRequestActions = {
  failed: contactlistActions.fetchSuggestedContactsFailed,
  fulfilled: contactlistActions.fetchSuggestedContactsFulfilled,
  pending: contactlistActions.fetchSuggestedContactsPending
}

export const peerContactlistRequestActions = {
  failed: contactlistActions.fetchPeerContactsFailed,
  fulfilled: contactlistActions.fetchPeerContactsFulfilled,
  pending: contactlistActions.fetchPeerContactsPending
}
