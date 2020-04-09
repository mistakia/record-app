export const contactActions = {
  FETCH_CONTACT_FAILED: 'FETCH_CONTACT_FAILED',
  FETCH_CONTACT_FULFILLED: 'FETCH_CONTACT_FULFILLED',
  FETCH_CONTACT_PENDING: 'FETCH_CONTACT_PENDING',

  CONNECT_CONTACT_FAILED: 'CONNECT_CONTACT_FAILED',
  CONNECT_CONTACT_FULFILLED: 'CONNECT_CONTACT_FULFILLED',
  CONNECT_CONTACT_PENDING: 'CONNECT_CONTACT_PENDING',

  DISCONNECT_CONTACT_FAILED: 'DISCONNECT_CONTACT_FAILED',
  DISCONNECT_CONTACT_FULFILLED: 'DISCONNECT_CONTACT_FULFILLED',
  DISCONNECT_CONTACT_PENDING: 'DISCONNECT_CONTACT_PENDING',

  LOAD_CONTACT: 'LOAD_CONTACT',

  CONNECT_CONTACT: 'CONNECT_CONTACT',
  DISCONNECT_CONTACT: 'DISCONNECT_CONTACT',

  CONTACT_CONNECTED: 'CONTACT_CONNECTED',
  CONTACT_DISCONNECTED: 'CONTACT_DISCONNECTED',

  CONTACT_REPLICATED: 'CONTACT_REPLICATED',
  CONTACT_REPLICATE_PROGRESS: 'CONTACT_REPLICATE_PROGRESS',

  RECORD_PEER_LEFT: 'RECORD_PEER_LEFT',
  RECORD_PEER_JOINED: 'RECORD_PEER_JOINED',
  CONTACT_PEER_JOINED: 'CONTACT_PEER_JOINED',

  CONTACT_INDEX_UPDATED: 'CONTACT_INDEX_UPDATED',

  connectContactFailed: (logId, error) => ({
    type: contactActions.CONNECT_CONTACT_FAILED,
    payload: { logId, error }
  }),

  connectContactPending: logId => ({
    type: contactActions.CONNECT_CONTACT_PENDING,
    payload: { logId }
  }),

  connectContactFulfilled: (logId, data) => ({
    type: contactActions.CONNECT_CONTACT_FULFILLED,
    payload: { logId, data }
  }),

  disconnectContactFailed: (logId, error) => ({
    type: contactActions.DISCONNECT_CONTACT_FAILED,
    payload: { logId, error }
  }),

  disconnectContactPending: logId => ({
    type: contactActions.DISCONNECT_CONTACT_PENDING,
    payload: { logId }
  }),

  disconnectContactFulfilled: (logId, data) => ({
    type: contactActions.DISCONNECT_CONTACT_FULFILLED,
    payload: { logId, data }
  }),

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

  connectContact: (logId, contactId) => ({
    type: contactActions.CONNECT_CONTACT,
    payload: { logId, contactId }
  }),

  disconnectContact: (logId, contactId) => ({
    type: contactActions.DISCONNECT_CONTACT,
    payload: { logId, contactId }
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

export const contactConnectActions = {
  failed: contactActions.connectContactFailed,
  fulfilled: contactActions.connectContactFulfilled,
  pending: contactActions.connectContactPending
}

export const contactDisconnectActions = {
  failed: contactActions.disconnectContactFailed,
  fulfilled: contactActions.disconnectContactFulfilled,
  pending: contactActions.disconnectContactPending
}
