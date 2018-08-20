export const profileActions = {
  FETCH_PROFILE_FAILED: 'FETCH_PROFILE_FAILED',
  FETCH_PROFILE_FULFILLED: 'FETCH_PROFILE_FULFILLED',
  FETCH_PROFILE_PENDING: 'FETCH_PROFILE_PENDING',

  LOAD_PROFILE: 'LOAD_PROFILE',

  SET_PROFILE: 'SET_PROFILE',

  POST_PROFILE_FAILED: 'POST_PROFILE_FAILED',
  POST_PROFILE_FULFILLED: 'POST_PROFILE_FULFILLED',
  POST_PROFILE_PENDING: 'POST_PROFILE_PENDING',

  fetchProfileFailed: error => ({
    type: profileActions.FETCH_PROFILE_FAILED,
    payload: error
  }),

  fetchProfileFulfilled: (logId, data) => ({
    type: profileActions.FETCH_PROFILE_FULFILLED,
    payload: {
      data,
      logId
    }
  }),

  fetchProfilePending: logId => ({
    type: profileActions.FETCH_PROFILE_PENDING,
    payload: {
      logId
    }
  }),

  loadProfile: logId => ({
    type: profileActions.LOAD_PROFILE,
    payload: {
      logId
    }
  }),

  postProfileFailed: error => ({
    type: profileActions.POST_PROFILE_FAILED,
    payload: error
  }),

  postProfileFulfilled: (logId, data) => ({
    type: profileActions.POST_PROFILE_FULFILLED,
    payload: {
      logId,
      data
    }
  }),

  postProfilePending: logId => ({
    type: profileActions.POST_PROFILE_PENDING,
    payload: {
      logId
    }
  }),

  setProfile: (data) => ({
    type: profileActions.SET_PROFILE,
    payload: {
      data
    }
  })
}

export const profileRequestActions = {
  failed: profileActions.fetchProfileFailed,
  fulfilled: profileActions.fetchProfileFulfilled,
  pending: profileActions.fetchProfilePending
}

export const profilePostActions = {
  failed: profileActions.postProfileFailed,
  fulfilled: profileActions.postProfileFulfilled,
  pending: profileActions.postProfilePending
}
