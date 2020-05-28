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

  fetchListensRequestFailed: (address, error) => ({
    type: listensActions.FETCH_LISTENS_FAILED,
    payload: {
      address,
      error
    }
  }),

  fetchListensRequestFulfilled: (address, data) => ({
    type: listensActions.FETCH_LISTENS_FULFILLED,
    payload: {
      address,
      data
    }
  }),

  fetchListensRequestPending: address => ({
    type: listensActions.FETCH_LISTENS_PENDING,
    payload: {
      address
    }
  }),

  postListenFailed: (address, error) => ({
    type: listensActions.POST_LISTEN_FAILED,
    payload: {
      address,
      error
    }
  }),

  postListenFulfilled: (address, data) => ({
    type: listensActions.POST_LISTEN_FULFILLED,
    payload: {
      address,
      data
    }
  }),

  postListenPending: address => ({
    type: listensActions.POST_LISTEN_PENDING,
    payload: {
      address
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
