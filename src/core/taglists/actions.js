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

  fetchTagsFailed: (address, error) => ({
    type: taglistActions.FETCH_TAGS_FAILED,
    payload: {
      address,
      error
    }
  }),

  fetchTagsFulfilled: (address, data) => ({
    type: taglistActions.FETCH_TAGS_FULFILLED,
    payload: {
      data,
      address
    }
  }),

  fetchTagsPending: address => ({
    type: taglistActions.FETCH_TAGS_PENDING,
    payload: {
      address
    }
  }),

  loadTags: addresses => ({
    type: taglistActions.LOAD_TAGS,
    payload: {
      addresses
    }
  }),

  postTagFailed: (address, error) => ({
    type: taglistActions.POST_TAG_FAILED,
    payload: {
      address,
      error
    }
  }),

  postTagFulfilled: (address, data) => ({
    type: taglistActions.POST_TAG_FULFILLED,
    payload: {
      address,
      data
    }
  }),

  postTagPending: address => ({
    type: taglistActions.POST_TAG_PENDING,
    payload: {
      address
    }
  }),

  addTag: (address, data) => ({
    type: taglistActions.ADD_TAG,
    payload: {
      address,
      data
    }
  }),

  deleteTagFailed: (address, error) => ({
    type: taglistActions.DELETE_TAG_FAILED,
    payload: {
      address,
      error
    }
  }),

  deleteTagFulfilled: (address, data) => ({
    type: taglistActions.DELETE_TAG_FULFILLED,
    payload: {
      address,
      data
    }
  }),

  deleteTagPending: address => ({
    type: taglistActions.DELETE_TAG_PENDING,
    payload: {
      address
    }
  }),

  removeTag: (address, data) => ({
    type: taglistActions.REMOVE_TAG,
    payload: {
      address,
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
