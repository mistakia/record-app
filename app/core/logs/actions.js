export const logActions = {
  FETCH_LOG_FAILED: 'FETCH_LOG_FAILED',
  FETCH_LOG_FULFILLED: 'FETCH_LOG_FULFILLED',
  FETCH_LOG_PENDING: 'FETCH_LOG_PENDING',

  CONNECT_LOG_FAILED: 'CONNECT_LOG_FAILED',
  CONNECT_LOG_FULFILLED: 'CONNECT_LOG_FULFILLED',
  CONNECT_LOG_PENDING: 'CONNECT_LOG_PENDING',

  DISCONNECT_LOG_FAILED: 'DISCONNECT_LOG_FAILED',
  DISCONNECT_LOG_FULFILLED: 'DISCONNECT_LOG_FULFILLED',
  DISCONNECT_LOG_PENDING: 'DISCONNECT_LOG_PENDING',

  LOAD_LOG: 'LOAD_LOG',

  LOG_LOADED: 'LOG_LOADED',
  LOG_LOADING: 'LOG_LOADING',

  CONNECT_LOG: 'CONNECT_LOG',
  DISCONNECT_LOG: 'DISCONNECT_LOG',

  LOG_CONNECTED: 'LOG_CONNECTED',
  LOG_DISCONNECTED: 'LOG_DISCONNECTED',

  LOG_REPLICATED: 'LOG_REPLICATED',
  LOG_REPLICATE_PROGRESS: 'LOG_REPLICATE_PROGRESS',

  RECORD_PEER_LEFT: 'RECORD_PEER_LEFT',
  RECORD_PEER_JOINED: 'RECORD_PEER_JOINED',
  LOG_PEER_JOINED: 'LOG_PEER_JOINED',

  LOG_INDEX_UPDATED: 'LOG_INDEX_UPDATED',

  DELETE_LOG: 'DELETE_LOG',

  DELETE_LOG_PENDING: 'DELETE_LOG_PENDING',
  DELETE_LOG_FAILED: 'DELETE_LOG_FAILED',
  DELETE_LOG_FULFILLED: 'DELETE_LOG_FULFILLED',

  connectLogFailed: (logAddress, error) => ({
    type: logActions.CONNECT_LOG_FAILED,
    payload: { logAddress, error }
  }),

  connectLogPending: logAddress => ({
    type: logActions.CONNECT_LOG_PENDING,
    payload: { logAddress }
  }),

  connectLogFulfilled: (logAddress, data) => ({
    type: logActions.CONNECT_LOG_FULFILLED,
    payload: { logAddress, data }
  }),

  disconnectLogFailed: (logAddress, error) => ({
    type: logActions.DISCONNECT_LOG_FAILED,
    payload: { logAddress, error }
  }),

  disconnectLogPending: logAddress => ({
    type: logActions.DISCONNECT_LOG_PENDING,
    payload: { logAddress }
  }),

  disconnectLogFulfilled: (logAddress, data) => ({
    type: logActions.DISCONNECT_LOG_FULFILLED,
    payload: { logAddress, data }
  }),

  fetchLogFailed: (logAddress, error) => ({
    type: logActions.FETCH_LOG_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  fetchLogFulfilled: (logAddress, data) => ({
    type: logActions.FETCH_LOG_FULFILLED,
    payload: {
      data,
      logAddress
    }
  }),

  fetchLogPending: logAddress => ({
    type: logActions.FETCH_LOG_PENDING,
    payload: {
      logAddress
    }
  }),

  connectLog: (logAddress) => ({
    type: logActions.CONNECT_LOG,
    payload: { logAddress }
  }),

  disconnectLog: (logAddress) => ({
    type: logActions.DISCONNECT_LOG,
    payload: { logAddress }
  }),

  loadLog: logAddress => ({
    type: logActions.LOAD_LOG,
    payload: {
      logAddress
    }
  }),

  deleteLog: (logAddress) => ({
    type: logActions.DELETE_LOG,
    payload: {
      logAddress
    }
  }),

  deleteLogFailed: (logAddress, error) => ({
    type: logActions.DELETE_LOG_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  deleteLogPending: logAddress => ({
    type: logActions.DELETE_LOG_PENDING,
    payload: {
      logAddress
    }
  }),

  deleteLogFulfilled: (logAddress, data) => ({
    type: logActions.DELETE_LOG_FULFILLED,
    payload: {
      logAddress,
      data
    }
  })
}

export const logRequestActions = {
  failed: logActions.fetchLogFailed,
  fulfilled: logActions.fetchLogFulfilled,
  pending: logActions.fetchLogPending
}

export const logConnectActions = {
  failed: logActions.connectLogFailed,
  fulfilled: logActions.connectLogFulfilled,
  pending: logActions.connectLogPending
}

export const logDisconnectActions = {
  failed: logActions.disconnectLogFailed,
  fulfilled: logActions.disconnectLogFulfilled,
  pending: logActions.disconnectLogPending
}

export const logDeleteActions = {
  failed: logActions.deleteLogFailed,
  fulfilled: logActions.deleteLogFulfilled,
  pending: logActions.deleteLogPending
}
