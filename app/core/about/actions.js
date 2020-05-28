export const aboutActions = {
  SET_ABOUT: 'SET_ABOUT',

  POST_ABOUT_FAILED: 'POST_ABOUT_FAILED',
  POST_ABOUT_FULFILLED: 'POST_ABOUT_FULFILLED',
  POST_ABOUT_PENDING: 'POST_ABOUT_PENDING',

  postAboutFailed: (address, error) => ({
    type: aboutActions.POST_ABOUT_FAILED,
    payload: {
      address,
      error
    }
  }),

  postAboutFulfilled: (address, data) => ({
    type: aboutActions.POST_ABOUT_FULFILLED,
    payload: {
      address,
      data
    }
  }),

  postAboutPending: address => ({
    type: aboutActions.POST_ABOUT_PENDING,
    payload: {
      address
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
