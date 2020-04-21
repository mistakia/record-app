export const loglistActions = {
  FETCH_LOGS_FAILED: 'FETCH_LOGS_FAILED',
  FETCH_LOGS_FULFILLED: 'FETCH_LOGS_FULFILLED',
  FETCH_LOGS_PENDING: 'FETCH_LOGS_PENDING',

  LOAD_LOGS: 'LOAD_LOGS',

  POST_LOG_FAILED: 'POST_LOG_FAILED',
  POST_LOG_FULFILLED: 'POST_LOG_FULFILLED',
  POST_LOG_PENDING: 'POST_LOG_PENDING',

  LINK_LOG: 'LINK_LOG',

  DELETE_LOG_FAILED: 'DELETE_LOG_FAILED',
  DELETE_LOG_FULFILLED: 'DELETE_LOG_FULFILLED',
  DELETE_LOG_PENDING: 'DELETE_LOG_PENDING',

  UNLINK_LOG: 'UNLINK_LOG',

  LOAD_ALL_LOGS: 'LOAD_ALL_LOGS',

  FETCH_ALL_LOGS_FAILED: 'FETCH_ALL_LOGS_FAILED',
  FETCH_ALL_LOGS_FULFILLED: 'FETCH_ALL_LOGS_FULFILLED',
  FETCH_ALL_LOGS_PENDING: 'FETCH_ALL_LOGS_PENDING',

  LOAD_PEER_LOGS: 'LOAD_PEER_LOGS',

  FETCH_PEER_LOGS_FAILED: 'FETCH_PEER_LOGS_FAILED',
  FETCH_PEER_LOGS_FULFILLED: 'FETCH_PEER_LOGS_FULFILLED',
  FETCH_PEER_LOGS_PENDING: 'FETCH_PEER_LOGS_PENDING',

  fetchLogsFailed: (logAddress, error) => ({
    type: loglistActions.FETCH_LOGS_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  fetchLogsFulfilled: (logAddress, data) => ({
    type: loglistActions.FETCH_LOGS_FULFILLED,
    payload: {
      data,
      logAddress
    }
  }),

  fetchLogsPending: logAddress => ({
    type: loglistActions.FETCH_LOGS_PENDING,
    payload: {
      logAddress
    }
  }),

  loadLogs: logAddress => ({
    type: loglistActions.LOAD_LOGS,
    payload: {
      logAddress
    }
  }),

  postLogFailed: (logAddress, error) => ({
    type: loglistActions.POST_LOG_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  postLogFulfilled: (logAddress, data) => ({
    type: loglistActions.POST_LOG_FULFILLED,
    payload: {
      logAddress,
      data
    }
  }),

  postLogPending: logAddress => ({
    type: loglistActions.POST_LOG_PENDING,
    payload: {
      logAddress
    }
  }),

  linkLog: (logAddress, data) => ({
    type: loglistActions.LINK_LOG,
    payload: {
      logAddress,
      data
    }
  }),

  unlinkLog: (data) => ({
    type: loglistActions.UNLINK_LOG,
    payload: {
      data
    }
  }),

  deleteLogFailed: (logAddress, error) => ({
    type: loglistActions.DELETE_LOG_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  deleteLogFulfilled: (logAddress, data) => ({
    type: loglistActions.DELETE_LOG_FULFILLED,
    payload: {
      logAddress,
      data
    }
  }),

  deleteLogPending: logAddress => ({
    type: loglistActions.DELETE_LOG_PENDING,
    payload: {
      logAddress
    }
  }),

  loadAllLogs: () => ({
    type: loglistActions.LOAD_ALL_LOGS
  }),

  fetchAllLogsFailed: (logAddress, error) => ({
    type: loglistActions.FETCH_ALL_LOGS_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  fetchAllLogsFulfilled: (logAddress, data) => ({
    type: loglistActions.FETCH_ALL_LOGS_FULFILLED,
    payload: {
      data,
      logAddress
    }
  }),

  fetchAllLogsPending: logAddress => ({
    type: loglistActions.FETCH_ALL_LOGS_PENDING,
    payload: {
      logAddress
    }
  }),

  loadPeerLogs: () => ({
    type: loglistActions.LOAD_PEER_LOGS
  }),

  fetchPeerLogsFailed: (logAddress, error) => ({
    type: loglistActions.FETCH_PEER_LOGS_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  fetchPeerLogsFulfilled: (logAddress, data) => ({
    type: loglistActions.FETCH_PEER_LOGS_FULFILLED,
    payload: {
      data,
      logAddress
    }
  }),

  fetchPeerLogsPending: logAddress => ({
    type: loglistActions.FETCH_PEER_LOGS_PENDING,
    payload: {
      logAddress
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
  failed: loglistActions.deleteLogFailed,
  fulfilled: loglistActions.deleteLogFulfilled,
  pending: loglistActions.deleteLogPending
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
