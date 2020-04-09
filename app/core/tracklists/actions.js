export const tracklistActions = {
  SEARCH_TRACKS: 'SEARCH_TRACKS',

  CLEAR_SEARCH: 'CLEAR_SEARCH',

  SEARCH_TRACKS_FAILED: 'SEARCH_TRACKS_FAILED',
  SEARCH_TRACKS_FULFILLED: 'SEARCH_TRACKS_FULFILLED',
  SEARCH_TRACKS_PENDING: 'SEARCH_TRACKS_PENDING',

  FETCH_TRACKS_FAILED: 'FETCH_TRACKS_FAILED',
  FETCH_TRACKS_FULFILLED: 'FETCH_TRACKS_FULFILLED',
  FETCH_TRACKS_PENDING: 'FETCH_TRACKS_PENDING',

  FETCH_TRACK_FAILED: 'FETCH_TRACK_FAILED',
  FETCH_TRACK_FULFILLED: 'FETCH_TRACK_FULFILLED',
  FETCH_TRACK_PENDING: 'FETCH_TRACK_PENDING',

  LOAD_TRACKS: 'LOAD_TRACKS',
  LOAD_NEXT_TRACKS: 'LOAD_NEXT_TRACKS',

  TOGGLE_TAG: 'TOGGLE_TAG',

  POST_TRACK_FAILED: 'POST_TRACK_FAILED',
  POST_TRACK_FULFILLED: 'POST_TRACK_FULFILLED',
  POST_TRACK_PENDING: 'POST_TRACK_PENDING',

  DELETE_TRACK_FAILED: 'DELETE_TRACK_FAILED',
  DELETE_TRACK_FULFILLED: 'DELETE_TRACK_FULFILLED',
  DELETE_TRACK_PENDING: 'DELETE_TRACK_PENDING',

  ADD_TRACK: 'ADD_TRACK',
  REMOVE_TRACK: 'REMOVE_TRACK',

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

  fetchTrackFailed: (logId, error) => ({
    type: tracklistActions.FETCH_TRACK_FAILED,
    payload: {
      logId,
      error
    }
  }),

  fetchTrackFulfilled: (logId, data) => ({
    type: tracklistActions.FETCH_TRACK_FULFILLED,
    payload: {
      data,
      logId
    }
  }),

  fetchTrackPending: logId => ({
    type: tracklistActions.FETCH_TRACK_PENDING,
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

  addTrack: (logId, data) => {
    return {
      type: tracklistActions.ADD_TRACK,
      payload: {
        logId,
        data
      }
    }
  },

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

  searchTracks: (logId, query, tags) => ({
    type: tracklistActions.SEARCH_TRACKS,
    payload: {
      logId,
      query,
      tags
    }
  }),

  searchTracksFailed: (logId, error) => ({
    type: tracklistActions.SEARCH_TRACKS_FAILED,
    payload: {
      logId,
      error
    }
  }),

  searchTracksFulfilled: (logId, data) => ({
    type: tracklistActions.SEARCH_TRACKS_FULFILLED,
    payload: {
      logId,
      data
    }
  }),

  searchTracksPending: logId => ({
    type: tracklistActions.SEARCH_TRACKS_PENDING,
    payload: {
      logId
    }
  })
}

export const tracklistSearchActions = {
  failed: tracklistActions.searchTracksFailed,
  fulfilled: tracklistActions.searchTracksFulfilled,
  pending: tracklistActions.searchTracksPending
}

export const tracklistRequestActions = {
  failed: tracklistActions.fetchTracksFailed,
  fulfilled: tracklistActions.fetchTracksFulfilled,
  pending: tracklistActions.fetchTracksPending
}

export const trackRequestActions = {
  failed: tracklistActions.fetchTrackFailed,
  fulfilled: tracklistActions.fetchTrackFulfilled,
  pending: tracklistActions.fetchTrackPending
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
