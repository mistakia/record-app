export const loglistActions = {
  FETCH_LOGS_FAILED: 'FETCH_LOGS_FAILED',
  FETCH_LOGS_FULFILLED: 'FETCH_LOGS_FULFILLED',
  FETCH_LOGS_PENDING: 'FETCH_LOGS_PENDING',

  LOAD_LOGS: 'LOAD_LOGS',

  POST_LOG_FAILED: 'POST_LOG_FAILED',
  POST_LOG_FULFILLED: 'POST_LOG_FULFILLED',
  POST_LOG_PENDING: 'POST_LOG_PENDING',

  LINK_LOG: 'LINK_LOG',

  DELETE_LOG_LINK_FAILED: 'DELETE_LOG_LINK_FAILED',
  DELETE_LOG_LINK_FULFILLED: 'DELETE_LOG_LINK_FULFILLED',
  DELETE_LOG_LINK_PENDING: 'DELETE_LOG_LINK_PENDING',

  UNLINK_LOG: 'UNLINK_LOG',

  LOAD_ALL_LOGS: 'LOAD_ALL_LOGS',

  FETCH_ALL_LOGS_FAILED: 'FETCH_ALL_LOGS_FAILED',
  FETCH_ALL_LOGS_FULFILLED: 'FETCH_ALL_LOGS_FULFILLED',
  FETCH_ALL_LOGS_PENDING: 'FETCH_ALL_LOGS_PENDING',

  LOAD_PEER_LOGS: 'LOAD_PEER_LOGS',

  FETCH_PEER_LOGS_FAILED: 'FETCH_PEER_LOGS_FAILED',
  FETCH_PEER_LOGS_FULFILLED: 'FETCH_PEER_LOGS_FULFILLED',
  FETCH_PEER_LOGS_PENDING: 'FETCH_PEER_LOGS_PENDING',

  fetchLogsFailed: (address, error) => ({
    type: loglistActions.FETCH_LOGS_FAILED,
    payload: {
      address,
      error
    }
  }),

  fetchLogsFulfilled: (address, data) => ({
    type: loglistActions.FETCH_LOGS_FULFILLED,
    payload: {
      data,
      address
    }
  }),

  fetchLogsPending: address => ({
    type: loglistActions.FETCH_LOGS_PENDING,
    payload: {
      address
    }
  }),

  loadLogs: address => ({
    type: loglistActions.LOAD_LOGS,
    payload: {
      address
    }
  }),

  postLogFailed: (address, error) => ({
    type: loglistActions.POST_LOG_FAILED,
    payload: {
      address,
      error
    }
  }),

  postLogFulfilled: (address, data) => ({
    type: loglistActions.POST_LOG_FULFILLED,
    payload: {
      address,
      data
    }
  }),

  postLogPending: address => ({
    type: loglistActions.POST_LOG_PENDING,
    payload: {
      address
    }
  }),

  linkLog: (address, data) => ({
    type: loglistActions.LINK_LOG,
    payload: {
      address,
      data
    }
  }),

  unlinkLog: (address) => ({
    type: loglistActions.UNLINK_LOG,
    payload: {
      address
    }
  }),

  deleteLogLinkFailed: (address, error) => ({
    type: loglistActions.DELETE_LOG_LINK_FAILED,
    payload: {
      address,
      error
    }
  }),

  deleteLogLinkFulfilled: (address, data) => ({
    type: loglistActions.DELETE_LOG_LINK_FULFILLED,
    payload: {
      address,
      data
    }
  }),

  deleteLogLinkPending: address => ({
    type: loglistActions.DELETE_LOG_LINK_PENDING,
    payload: {
      address
    }
  }),

  loadAllLogs: () => ({
    type: loglistActions.LOAD_ALL_LOGS
  }),

  fetchAllLogsFailed: (address, error) => ({
    type: loglistActions.FETCH_ALL_LOGS_FAILED,
    payload: {
      address,
      error
    }
  }),

  fetchAllLogsFulfilled: (address, data) => ({
    type: loglistActions.FETCH_ALL_LOGS_FULFILLED,
    payload: {
      data,
      address
    }
  }),

  fetchAllLogsPending: address => ({
    type: loglistActions.FETCH_ALL_LOGS_PENDING,
    payload: {
      address
    }
  }),

  loadPeerLogs: () => ({
    type: loglistActions.LOAD_PEER_LOGS
  }),

  fetchPeerLogsFailed: (address, error) => ({
    type: loglistActions.FETCH_PEER_LOGS_FAILED,
    payload: {
      address,
      error
    }
  }),

  fetchPeerLogsFulfilled: (address, data) => ({
    type: loglistActions.FETCH_PEER_LOGS_FULFILLED,
    payload: {
      data,
      address
    }
  }),

  fetchPeerLogsPending: address => ({
    type: loglistActions.FETCH_PEER_LOGS_PENDING,
    payload: {
      address
    }
  })
}

export const loglistRequestActions = {
  failed: loglistActions.fetchLogsFailed,
  fulfilled: loglistActions.fetchLogsFulfilled,
  pending: loglistActions.fetchLogsPending
}

export const loglistPostActions = {
  failed: loglistActions.postLogFailed,
  fulfilled: loglistActions.postLogFulfilled,
  pending: loglistActions.postLogPending
}

export const loglistDeleteActions = {
  failed: loglistActions.deleteLogLinkFailed,
  fulfilled: loglistActions.deleteLogLinkFulfilled,
  pending: loglistActions.deleteLogLinkPending
}

export const allLoglistRequestActions = {
  failed: loglistActions.fetchAllLogsFailed,
  fulfilled: loglistActions.fetchAllLogsFulfilled,
  pending: loglistActions.fetchAllLogsPending
}

export const peerLoglistRequestActions = {
  failed: loglistActions.fetchPeerLogsFailed,
  fulfilled: loglistActions.fetchPeerLogsFulfilled,
  pending: loglistActions.fetchPeerLogsPending
}
