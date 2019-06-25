export const tracklistActions = {
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

  fetchTracksFailed: error => ({
    type: tracklistActions.FETCH_TRACKS_FAILED,
    payload: error
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

  fetchTrackFailed: error => ({
    type: tracklistActions.FETCH_TRACK_FAILED,
    payload: error
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

  postTrackFailed: error => ({
    type: tracklistActions.POST_TRACK_FAILED,
    payload: error
  }),

  postTrackFulfilled: (logId, data) => ({
    type: tracklistActions.POST_TRACK_FULFILLED,
    payload: {
      logId,
      data
    }
  }),

  postTrackPending: (logId, data) => ({
    type: tracklistActions.POST_TRACK_PENDING,
    payload: {
      logId
    }
  }),

  addTrack: (data) => ({
    type: tracklistActions.ADD_TRACK,
    payload: {
      data
    }
  }),

  removeTrack: (data) => ({
    type: tracklistActions.REMOVE_TRACK,
    payload: {
      data
    }
  }),

  deleteTrackFailed: error => ({
    type: tracklistActions.DELETE_TRACK_FAILED,
    payload: error
  }),

  deleteTrackPending: (logId, data) => ({
    type: tracklistActions.DELETE_TRACK_PENDING,
    payload: {
      logId,
      data
    }
  }),

  deleteTrackFulfilled: (logId, data) => ({
    type: tracklistActions.DELETE_TRACK_FULFILLED,
    payload: {
      logId,
      data
    }
  })
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
