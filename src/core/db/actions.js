export const dbActions = {
  DB_INIT_FAILED: 'DB_INIT_FAILED',
  DB_INIT_FULFILLED: 'DB_INIT_FULFILLED',
  DB_INIT_PENDING: 'DB_INIT_PENDING',

  DB_INIT: 'DB_INIT',

  DB_LOAD_FAILED: 'DB_LOAD_FAILED',
  DB_LOAD_FULFILLED: 'DB_LOAD_FULFILLED',
  DB_LOAD_PENDING: 'DB_LOAD_PENDING',

  DB_LOAD: 'DB_LOAD',

  initFailed: error => ({
    type: dbActions.DB_INIT_FAILED,
    payload: error
  }),

  initFulfilled: (id, data) => ({
    type: dbActions.DB_INIT_FULFILLED,
    payload: data
  }),

  initPending: () => ({
    type: dbActions.DB_INIT_PENDING
  }),

  init: () => ({
    type: dbActions.DB_INIT
  })
}

export const initRequestActions = {
  failed: dbActions.initFailed,
  fulfilled: dbActions.initFulfilled,
  pending: dbActions.initPending
}
