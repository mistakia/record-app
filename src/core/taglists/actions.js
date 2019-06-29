export const taglistActions = {
  FETCH_TAGS_FAILED: 'FETCH_TAGS_FAILED',
  FETCH_TAGS_FULFILLED: 'FETCH_TAGS_FULFILLED',
  FETCH_TAGS_PENDING: 'FETCH_TAGS_PENDING',

  LOAD_TAGS: 'LOAD_TAGS',

  POST_TAG_FAILED: 'POST_TAG_FAILED',
  POST_TAG_FULFILLED: 'POST_TAG_FULFILLED',
  POST_TAG_PENDING: 'POST_TAG_PENDING',

  ADD_TAG: 'ADD_TAG',

  DELETE_TAG_FAILED: 'DELETE_TAG_FAILED',
  DELETE_TAG_FULFILLED: 'DELETE_TAG_FULFILLED',
  DELETE_TAG_PENDING: 'DELETE_TAG_PENDING',

  REMOVE_TAG: 'REMOVE_TAG',

  fetchTagsFailed: (logId, error) => ({
    type: taglistActions.FETCH_TAGS_FAILED,
    payload: {
      logId,
      error
    }
  }),

  fetchTagsFulfilled: (logId, data) => ({
    type: taglistActions.FETCH_TAGS_FULFILLED,
    payload: {
      data,
      logId
    }
  }),

  fetchTagsPending: logId => ({
    type: taglistActions.FETCH_TAGS_PENDING,
    payload: {
      logId
    }
  }),

  loadTags: logId => ({
    type: taglistActions.LOAD_TAGS,
    payload: {
      logId
    }
  }),

  postTagFailed: (logId, error) => ({
    type: taglistActions.POST_TAG_FAILED,
    payload: {
      logId,
      error
    }
  }),

  postTagFulfilled: (logId, data) => ({
    type: taglistActions.POST_TAG_FULFILLED,
    payload: {
      logId,
      data
    }
  }),

  postTagPending: (logId, data) => ({
    type: taglistActions.POST_TAG_PENDING,
    payload: {
      logId
    }
  }),

  addTag: (logId, data) => ({
    type: taglistActions.ADD_TAG,
    payload: {
      logId,
      data
    }
  }),

  deleteTagFailed: (logId, error) => ({
    type: taglistActions.DELETE_TAG_FAILED,
    payload: {
      logId,
      error
    }
  }),

  deleteTagFulfilled: (logId, data) => ({
    type: taglistActions.DELETE_TAG_FULFILLED,
    payload: {
      logId,
      data
    }
  }),

  deleteTagPending: logId => ({
    type: taglistActions.DELETE_TAG_PENDING,
    payload: {
      logId
    }
  }),

  removeTag: (logId, data) => ({
    type: taglistActions.REMOVE_TAG,
    payload: {
      logId,
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
