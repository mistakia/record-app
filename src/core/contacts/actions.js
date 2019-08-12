export const contactActions = {
  FETCH_CONTACT_FAILED: 'FETCH_CONTACT_FAILED',
  FETCH_CONTACT_FULFILLED: 'FETCH_CONTACT_FULFILLED',
  FETCH_CONTACT_PENDING: 'FETCH_CONTACT_PENDING',

  LOAD_CONTACT: 'LOAD_CONTACT',

  CONTACT_CONNECTED: 'CONTACT_CONNECTED',
  CONTACT_DISCONNECTED: 'CONTACT_DISCONNECTED',

  CONTACT_REPLICATED: 'CONTACT_REPLICATED',
  CONTACT_REPLICATE_PROGRESS: 'CONTACT_REPLICATE_PROGRESS',

  RECORD_PEER_LEFT: 'RECORD_PEER_LEFT',
  RECORD_PEER_JOINED: 'RECORD_PEER_JOINED',
  CONTACT_PEER_JOINED: 'CONTACT_PEER_JOINED',

  CONTACT_INDEX_UPDATED: 'CONTACT_INDEX_UPDATED',

  fetchContactFailed: (logId, error) => ({
    type: contactActions.FETCH_CONTACT_FAILED,
    payload: {
      logId,
      error
    }
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
