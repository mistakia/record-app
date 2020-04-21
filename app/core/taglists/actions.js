export const taglistActions = {
  LOAD_TAGS: 'LOAD_TAGS',

  ADD_TAG: 'ADD_TAG',
  REMOVE_TAG: 'REMOVE_TAG',

  FETCH_TAGS_FAILED: 'FETCH_TAGS_FAILED',
  FETCH_TAGS_FULFILLED: 'FETCH_TAGS_FULFILLED',
  FETCH_TAGS_PENDING: 'FETCH_TAGS_PENDING',

  POST_TAG_FAILED: 'POST_TAG_FAILED',
  POST_TAG_FULFILLED: 'POST_TAG_FULFILLED',
  POST_TAG_PENDING: 'POST_TAG_PENDING',

  DELETE_TAG_FAILED: 'DELETE_TAG_FAILED',
  DELETE_TAG_FULFILLED: 'DELETE_TAG_FULFILLED',
  DELETE_TAG_PENDING: 'DELETE_TAG_PENDING',

  fetchTagsFailed: (logAddress, error) => ({
    type: taglistActions.FETCH_TAGS_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  fetchTagsFulfilled: (logAddress, data) => ({
    type: taglistActions.FETCH_TAGS_FULFILLED,
    payload: {
      data,
      logAddress
    }
  }),

  fetchTagsPending: logAddress => ({
    type: taglistActions.FETCH_TAGS_PENDING,
    payload: {
      logAddress
    }
  }),

  loadTags: logAddress => ({
    type: taglistActions.LOAD_TAGS,
    payload: {
      logAddress
    }
  }),

  postTagFailed: (logAddress, error) => ({
    type: taglistActions.POST_TAG_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  postTagFulfilled: (logAddress, data) => ({
    type: taglistActions.POST_TAG_FULFILLED,
    payload: {
      logAddress,
      data
    }
  }),

  postTagPending: logAddress => ({
    type: taglistActions.POST_TAG_PENDING,
    payload: {
      logAddress
    }
  }),

  addTag: (logAddress, data) => ({
    type: taglistActions.ADD_TAG,
    payload: {
      logAddress,
      data
    }
  }),

  deleteTagFailed: (logAddress, error) => ({
    type: taglistActions.DELETE_TAG_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  deleteTagFulfilled: (logAddress, data) => ({
    type: taglistActions.DELETE_TAG_FULFILLED,
    payload: {
      logAddress,
      data
    }
  }),

  deleteTagPending: logAddress => ({
    type: taglistActions.DELETE_TAG_PENDING,
    payload: {
      logAddress
    }
  }),

  removeTag: (logAddress, data) => ({
    type: taglistActions.REMOVE_TAG,
    payload: {
      logAddress,
      data
    }
  })
}

export const taglistRequestActions = {
  failed: taglistActions.fetchTagsFailed,
  fulfilled: taglistActions.fetchTagsFulfilled,
  pending: taglistActions.fetchTagsPending
}

export const taglistPostActions = {
  failed: taglistActions.postTagFailed,
  fulfilled: taglistActions.postTagFulfilled,
  pending: taglistActions.postTagPending
}

export const taglistDeleteActions = {
  failed: taglistActions.deleteTagFailed,
  fulfilled: taglistActions.deleteTagFulfilled,
  pending: taglistActions.deleteTagPending
}
