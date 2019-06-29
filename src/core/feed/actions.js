export const feedActions = {
  FETCH_FEED_FAILED: 'FETCH_FEED_FAILED',
  FETCH_FEED_FULFILLED: 'FETCH_FEED_FULFILLED',
  FETCH_FEED_PENDING: 'FETCH_FEED_PENDING',

  LOAD_FEED: 'LOAD_FEED',
  LOAD_NEXT_FEED: 'LOAD_NEXT_FEED',

  loadFeed: () => ({
    type: feedActions.LOAD_FEED
  }),

  loadNextFeed: () => ({
    type: feedActions.LOAD_NEXT_FEED
  }),

  fetchFeedFailed: (logId, error) => ({
    type: feedActions.FETCH_FEED_FAILED,
    payload: {
      logId,
      error
    }
  }),

  fetchFeedFulfilled: (id, data) => ({
    type: feedActions.FETCH_FEED_FULFILLED,
    payload: {
      data
    }
  }),

  fetchFeedPending: () => ({
    type: feedActions.FETCH_FEED_PENDING
  })
}

export const feedRequestActions = {
  failed: feedActions.fetchFeedFailed,
  fulfilled: feedActions.fetchFeedFulfilled,
  pending: feedActions.fetchFeedPending
}
