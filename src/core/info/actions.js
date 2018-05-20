export const infoActions = {
  INFO_INIT_FAILED: 'INFO_INIT_FAILED',
  INFO_INIT_FULFILLED: 'INFO_INIT_FULFILLED',
  INFO_INIT_PENDING: 'INFO_INIT_PENDING',

  INFO_INIT: 'INFO_INIT',

  initFailed: error => ({
    type: infoActions.INFO_INIT_FAILED,
    payload: error
  }),

  initFulfilled: (id, data) => ({
    type: infoActions.INFO_INIT_FULFILLED,
    payload: data
  }),

  initPending: () => ({
    type: infoActions.INFO_INIT_PENDING
  }),

  init: () => ({
    type: infoActions.INFO_INIT
  })
}

export const infoRequestActions = {
  failed: infoActions.initFailed,
  fulfilled: infoActions.initFulfilled,
  pending: infoActions.initPending
}
