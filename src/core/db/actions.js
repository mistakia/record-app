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

  initFulfilled: data => ({
    type: dbActions.DB_INIT_FULFILLED,
    payload: data
  }),

  initPending: () => ({
    type: dbActions.DB_INIT_PENDING
  }),

  init: () => ({
    type: dbActions.DB_INIT
  }),

  loadFailed: error => ({
    type: dbActions.DB_LOAD_FAILED,
    payload: error
  }),

  loadFulfilled: data => ({
    type: dbActions.DB_LOAD_FULFILLED,
    payload: data
  }),

  loadPending: () => ({
    type: dbActions.DB_LOAD_PENDING
  }),

  load: (address) => ({
    type: dbActions.DB_LOAD,
    payload: address
  })
}

export const initRequestActions = {
  failed: dbActions.initFailed,
  fulfilled: dbActions.initFulfilled,
  pending: dbActions.initPending
}

export const loadRequestActions = {
  failed: dbActions.loadFailed,
  fulfilled: dbActions.loadFulfilled,
  pending: dbActions.loadPending
}
