export const logActions = {
  DELETE_LOG: 'DELETE_LOG',

  DELETE_LOG_PENDING: 'DELETE_LOG_PENDING',
  DELETE_LOG_FAILED: 'DELETE_LOG_FAILED',
  DELETE_LOG_FULFILLED: 'DELETE_LOG_FULFILLED',

  deleteLog: (logId) => ({
    type: logActions.DELETE_LOG,
    payload: {
      logId
    }
  }),

  deleteLogFailed: (logId, error) => ({
    type: logActions.DELETE_LOG_FAILED,
    payload: {
      logId,
      error
    }
  }),

  deleteLogPending: logId => ({
    type: logActions.DELETE_LOG_PENDING,
    payload: {
      logId
    }
  }),

  deleteLogFulfilled: (logId, data) => ({
    type: logActions.DELETE_LOG_FULFILLED,
    payload: {
      logId,
      data
    }
  })
}

export const deleteLogActions = {
  failed: logActions.deleteLogFailed,
  fulfilled: logActions.deleteLogFulfilled,
  pending: logActions.deleteLogPending
}
