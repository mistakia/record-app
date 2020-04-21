export const aboutActions = {
  SET_ABOUT: 'SET_ABOUT',

  POST_ABOUT_FAILED: 'POST_ABOUT_FAILED',
  POST_ABOUT_FULFILLED: 'POST_ABOUT_FULFILLED',
  POST_ABOUT_PENDING: 'POST_ABOUT_PENDING',

  postAboutFailed: (logAddress, error) => ({
    type: aboutActions.POST_ABOUT_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  postAboutFulfilled: (logAddress, data) => ({
    type: aboutActions.POST_ABOUT_FULFILLED,
    payload: {
      logAddress,
      data
    }
  }),

  postAboutPending: logAddress => ({
    type: aboutActions.POST_ABOUT_PENDING,
    payload: {
      logAddress
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
