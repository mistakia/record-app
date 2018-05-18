export const contactlistActions = {
  FETCH_CONTACTS_FAILED: 'FETCH_CONTACTS_FAILED',
  FETCH_CONTACTS_FULFILLED: 'FETCH_CONTACTS_FULFILLED',
  FETCH_CONTACTS_PENDING: 'FETCH_CONTACTS_PENDING',

  LOAD_CONTACTS: 'LOAD_CONTACTS',

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
  })
}

export const contactlistRequestActions = {
  failed: contactlistActions.fetchContactsFailed,
  fulfilled: contactlistActions.fetchContactsFulfilled,
  pending: contactlistActions.fetchContactsPending
}
