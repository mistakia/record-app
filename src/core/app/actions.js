export const appActions = {
  INIT_APP: 'INIT_APP',

  LOGS_CONNECTED: 'LOGS_CONNECTED',
  LOGS_DISCONNECTED: 'LOGS_DISCONNECTED',

  SET_IDENTITY: 'SET_IDENTITY',

  SET_IDENTITY_FAILED: 'SET_IDENTITY_FAILED',
  SET_IDENTITY_FULFILLED: 'SET_IDENTITY_FULFILLED',
  SET_IDENTITY_PENDING: 'SET_IDENTITY_PENDING',

  GET_PRIVATE_KEY: 'GET_PRIVATE_KEY',

  GET_PRIVATE_KEY_FAILED: 'GET_PRIVATE_KEY_FAILED',
  GET_PRIVATE_KEY_PENDING: 'GET_PRIVATE_KEY_PENDING',
  GET_PRIVATE_KEY_FULFILLED: 'GET_PRIVATE_KEY_FULFILLED',

  initApp: (data) => ({
    type: appActions.INIT_APP,
    payload: data
  }),

  setIdentity: (pk) => ({
    type: appActions.SET_IDENTITY,
    payload: pk
  }),

  setIdentityFailed: error => ({
    type: appActions.SET_IDENTITY_FAILED,
    payload: error
  }),

  setIdentityPending: () => ({
    type: appActions.SET_IDENTITY_PENDING
  }),

  setIdentityFulfilled: (address, data) => ({
    type: appActions.SET_IDENTITY_FULFILLED,
    payload: data
  }),

  getPrivateKey: () => ({
    type: appActions.GET_PRIVATE_KEY
  }),

  getPrivateKeyFailed: error => ({
    type: appActions.GET_PRIVATE_KEY_FAILED,
    payload: error
  }),

  getPrivateKeyFulfilled: (address, data) => ({
    type: appActions.GET_PRIVATE_KEY_FULFILLED,
    payload: data
  }),

  getPrivateKeyPending: () => ({
    type: appActions.GET_PRIVATE_KEY_PENDING
  })
}

export const setIdentityActions = {
  failed: appActions.setIdentityFailed,
  fulfilled: appActions.setIdentityFulfilled,
  pending: appActions.setIdentityPending
}

export const getPrivateKeyActions = {
  failed: appActions.getPrivateKeyFailed,
  fulfilled: appActions.getPrivateKeyFulfilled,
  pending: appActions.getPrivateKeyPending
}
