export const identityActions = {
  FETCH_IDENTITY_FAILED: 'FETCH_IDENTITY_FAILED',
  FETCH_IDENTITY_FULFILLED: 'FETCH_IDENTITY_FULFILLED',
  FETCH_IDENTITY_PENDING: 'FETCH_IDENTITY_PENDING',

  LOAD_IDENTITY: 'LOAD_IDENTITY',

  fetchIdentityFailed: error => ({
    type: identityActions.FETCH_IDENTITY_FAILED,
    payload: error
  }),

  fetchIdentityFulfilled: identity => ({
    type: identityActions.FETCH_IDENTITY_FULFILLED,
    payload: {
      identity
    }
  }),

  fetchIdentityPending: () => ({
    type: identityActions.FETCH_IDENTITY_PENDING
  }),

  loadIdentity: id => ({
    type: identityActions.LOAD_IDENTITY,
    payload: {
      id
    }
  })
}

export const identityRequestActions = {
  failed: identityActions.fetchIdentityFailed,
  fulfilled: identityActions.fetchIdentityFulfilled,
  pending: identityActions.fetchIdentityPending
}
