export const listensActions = {
  FETCH_LISTENS_PENDING: 'FETCH_LISTENS_PENDING',
  FETCH_LISTENS_FULFILLED: 'FETCH_LISTENS_FULFILLED',
  FETCH_LISTENS_FAILED: 'FETCH_LISTENS_FAILED',

  POST_LISTEN_PENDING: 'POST_LISTEN_PENDING',
  POST_LISTEN_FULFILLED: 'POST_LISTEN_FULFILLED',
  POST_LISTEN_FAILED: 'POST_LISTEN_FAILED',

  LOAD_LISTENS: 'LOAD_LISTENS',
  LOAD_NEXT_LISTENS: 'LOAD_NEXT_LISTENS',

  loadListens: () => ({
    type: listensActions.LOAD_LISTENS
  }),

  loadNextListens: () => ({
    type: listensActions.LOAD_NEXT_LISTENS
  }),

  fetchListensRequestFailed: (logAddress, error) => ({
    type: listensActions.FETCH_LISTENS_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  fetchListensRequestFulfilled: (logAddress, data) => ({
    type: listensActions.FETCH_LISTENS_FULFILLED,
    payload: {
      logAddress,
      data
    }
  }),

  fetchListensRequestPending: logAddress => ({
    type: listensActions.FETCH_LISTENS_PENDING,
    payload: {
      logAddress
    }
  }),

  postListenFailed: (logAddress, error) => ({
    type: listensActions.POST_LISTEN_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  postListenFulfilled: (logAddress, data) => ({
    type: listensActions.POST_LISTEN_FULFILLED,
    payload: {
      logAddress,
      data
    }
  }),

  postListenPending: logAddress => ({
    type: listensActions.POST_LISTEN_PENDING,
    payload: {
      logAddress
    }
  })
}

export const listensRequestActions = {
  failed: listensActions.fetchListensRequestFailed,
  fulfilled: listensActions.fetchListensRequestFulfilled,
  pending: listensActions.fetchListensRequestPending
}

export const listenPostActions = {
  failed: listensActions.postListenFailed,
  fulfilled: listensActions.postListenFulfilled,
  pending: listensActions.postListenPending
}
