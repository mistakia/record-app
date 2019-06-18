export const contactActions = {
  FETCH_CONTACT_FAILED: 'FETCH_CONTACT_FAILED',
  FETCH_CONTACT_FULFILLED: 'FETCH_CONTACT_FULFILLED',
  FETCH_CONTACT_PENDING: 'FETCH_CONTACT_PENDING',

  LOAD_CONTACT: 'LOAD_CONTACT',

  fetchContactFailed: error => ({
    type: contactActions.FETCH_CONTACT_FAILED,
    payload: error
  }),

  fetchContactFulfilled: (logId, data) => ({
    type: contactActions.FETCH_CONTACT_FULFILLED,
    payload: {
      data,
      logId
    }
  }),

  fetchContactPending: logId => ({
    type: contactActions.FETCH_CONTACT_PENDING,
    payload: {
      logId
    }
  }),

  loadContact: logId => ({
    type: contactActions.LOAD_CONTACT,
    payload: {
      logId
    }
  })
}

export const contactRequestActions = {
  failed: contactActions.fetchContactFailed,
  fulfilled: contactActions.fetchContactFulfilled,
  pending: contactActions.fetchContactPending
}
