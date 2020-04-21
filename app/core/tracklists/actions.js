export const tracklistActions = {
  LOAD_TRACKS: 'LOAD_TRACKS',
  LOAD_NEXT_TRACKS: 'LOAD_NEXT_TRACKS',

  ADD_TRACK: 'ADD_TRACK',
  REMOVE_TRACK: 'REMOVE_TRACK',

  TOGGLE_TAG: 'TOGGLE_TAG',
  SEARCH_TRACKS: 'SEARCH_TRACKS',
  CLEAR_SEARCH: 'CLEAR_SEARCH',

  FETCH_TRACKS_FAILED: 'FETCH_TRACKS_FAILED',
  FETCH_TRACKS_FULFILLED: 'FETCH_TRACKS_FULFILLED',
  FETCH_TRACKS_PENDING: 'FETCH_TRACKS_PENDING',

  POST_TRACK_FAILED: 'POST_TRACK_FAILED',
  POST_TRACK_FULFILLED: 'POST_TRACK_FULFILLED',
  POST_TRACK_PENDING: 'POST_TRACK_PENDING',

  DELETE_TRACK_FAILED: 'DELETE_TRACK_FAILED',
  DELETE_TRACK_FULFILLED: 'DELETE_TRACK_FULFILLED',
  DELETE_TRACK_PENDING: 'DELETE_TRACK_PENDING',

  fetchTracksFailed: (logAddress, error) => ({
    type: tracklistActions.FETCH_TRACKS_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  fetchTracksFulfilled: (logAddress, data) => ({
    type: tracklistActions.FETCH_TRACKS_FULFILLED,
    payload: {
      data,
      logAddress
    }
  }),

  fetchTracksPending: logAddress => ({
    type: tracklistActions.FETCH_TRACKS_PENDING,
    payload: {
      logAddress
    }
  }),

  loadTracks: ({ logAddress, tags, query }) => ({
    type: tracklistActions.LOAD_TRACKS,
    payload: {
      logAddress,
      tags,
      query
    }
  }),

  toggleTag: (tag) => ({
    type: tracklistActions.TOGGLE_TAG,
    payload: {
      tag
    }
  }),

  loadNextTracks: () => ({
    type: tracklistActions.LOAD_NEXT_TRACKS
  }),

  postTrackFailed: (logAddress, error) => ({
    type: tracklistActions.POST_TRACK_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  postTrackFulfilled: (logAddress, data) => ({
    type: tracklistActions.POST_TRACK_FULFILLED,
    payload: {
      logAddress,
      data
    }
  }),

  postTrackPending: logAddress => ({
    type: tracklistActions.POST_TRACK_PENDING,
    payload: {
      logAddress
    }
  }),

  addTrack: (logAddress, data) => ({
    type: tracklistActions.ADD_TRACK,
    payload: {
      logAddress,
      data
    }
  }),

  removeTrack: (logAddress, data) => ({
    type: tracklistActions.REMOVE_TRACK,
    payload: {
      logAddress,
      data
    }
  }),

  deleteTrackFailed: (logAddress, error) => ({
    type: tracklistActions.DELETE_TRACK_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  deleteTrackPending: logAddress => ({
    type: tracklistActions.DELETE_TRACK_PENDING,
    payload: {
      logAddress
    }
  }),

  deleteTrackFulfilled: (logAddress, data) => ({
    type: tracklistActions.DELETE_TRACK_FULFILLED,
    payload: {
      logAddress,
      data
    }
  }),

  clearSearch: (logAddress) => ({
    type: tracklistActions.CLEAR_SEARCH,
    payload: { logAddress }
  }),

  searchTracks: (query) => ({
    type: tracklistActions.SEARCH_TRACKS,
    payload: {
      query
    }
  })
}

export const tracklistRequestActions = {
  failed: tracklistActions.fetchTracksFailed,
  fulfilled: tracklistActions.fetchTracksFulfilled,
  pending: tracklistActions.fetchTracksPending
}

export const tracklistPostActions = {
  failed: tracklistActions.postTrackFailed,
  fulfilled: tracklistActions.postTrackFulfilled,
  pending: tracklistActions.postTrackPending
}

export const tracklistDeleteActions = {
  failed: tracklistActions.deleteTrackFailed,
  fulfilled: tracklistActions.deleteTrackFulfilled,
  pending: tracklistActions.deleteTrackPending
}
