export const dbActions = {
  DB_INIT_FAILED: 'DB_INIT_FAILED',
  DB_INIT_FULFILLED: 'DB_INIT_FULFILLED',
  DB_INIT_PENDING: 'DB_INIT_PENDING',

  DB_INIT: 'DB_INIT',

  initFailed: error => ({
    type: dbActions.DB_INIT_FAILED,
    payload: error
  }),

  initFulfilled: data => ({
    type: dbActions.DB_INIT_FULFILLED,
    payload: data
  }),

  initPending: () => ({
    type: dbActions.DB_INIT_PENDING
  }),

  init: (peerId, privateKey) => ({
    type: dbActions.DB_INIT,
    payload: { peerId, privateKey }
  })
}

export const idRequestActions = {
  failed: dbActions.initFailed,
  fulfilled: dbActions.initFulfilled,
  pending: dbActions.initPending
}
