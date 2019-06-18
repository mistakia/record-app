export const aboutActions = {
  SET_ABOUT: 'SET_ABOUT',

  POST_ABOUT_FAILED: 'POST_ABOUT_FAILED',
  POST_ABOUT_FULFILLED: 'POST_ABOUT_FULFILLED',
  POST_ABOUT_PENDING: 'POST_ABOUT_PENDING',

  postAboutFailed: error => ({
    type: aboutActions.POST_ABOUT_FAILED,
    payload: error
  }),

  postAboutFulfilled: (logId, data) => ({
    type: aboutActions.POST_ABOUT_FULFILLED,
    payload: {
      logId,
      data
    }
  }),

  postAboutPending: logId => ({
    type: aboutActions.POST_ABOUT_PENDING,
    payload: {
      logId
    }
  }),

  setAbout: (data) => ({
    type: aboutActions.SET_ABOUT,
    payload: {
      data
    }
  })
}

export const aboutPostActions = {
  failed: aboutActions.postAboutFailed,
  fulfilled: aboutActions.postAboutFulfilled,
  pending: aboutActions.postAboutPending
}
