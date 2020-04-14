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

  fetchTracksFailed: (logId, error) => ({
    type: tracklistActions.FETCH_TRACKS_FAILED,
    payload: {
      logId,
      error
    }
  }),

  fetchTracksFulfilled: (logId, data) => ({
    type: tracklistActions.FETCH_TRACKS_FULFILLED,
    payload: {
      data,
      logId
    }
  }),

  fetchTracksPending: logId => ({
    type: tracklistActions.FETCH_TRACKS_PENDING,
    payload: {
      logId
    }
  }),

  loadTracks: (logId, tags) => ({
    type: tracklistActions.LOAD_TRACKS,
    payload: {
      logId,
      tags
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

  postTrackFailed: (logId, error) => ({
    type: tracklistActions.POST_TRACK_FAILED,
    payload: {
      logId,
      error
    }
  }),

  postTrackFulfilled: (logId, data) => ({
    type: tracklistActions.POST_TRACK_FULFILLED,
    payload: {
      logId,
      data
    }
  }),

  postTrackPending: logId => ({
    type: tracklistActions.POST_TRACK_PENDING,
    payload: {
      logId
    }
  }),

  addTrack: (logId, data) => ({
    type: tracklistActions.ADD_TRACK,
    payload: {
      logId,
      data
    }
  }),

  removeTrack: (logId, data) => ({
    type: tracklistActions.REMOVE_TRACK,
    payload: {
      logId,
      data
    }
  }),

  deleteTrackFailed: (logId, error) => ({
    type: tracklistActions.DELETE_TRACK_FAILED,
    payload: {
      logId,
      error
    }
  }),

  deleteTrackPending: logId => ({
    type: tracklistActions.DELETE_TRACK_PENDING,
    payload: {
      logId
    }
  }),

  deleteTrackFulfilled: (logId, data) => ({
    type: tracklistActions.DELETE_TRACK_FULFILLED,
    payload: {
      logId,
      data
    }
  }),

  clearSearch: (logId) => ({
    type: tracklistActions.CLEAR_SEARCH,
    payload: { logId }
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
