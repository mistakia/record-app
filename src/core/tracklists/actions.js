export const tracklistActions = {
  FETCH_TRACKS_FAILED: 'FETCH_TRACKS_FAILED',
  FETCH_TRACKS_FULFILLED: 'FETCH_TRACKS_FULFILLED',
  FETCH_TRACKS_PENDING: 'FETCH_TRACKS_PENDING',

  LOAD_TRACKS: 'LOAD_TRACKS',

  POST_TRACK_FAILED: 'POST_TRACK_FAILED',
  POST_TRACK_FULFILLED: 'POST_TRACK_FULFILLED',
  POST_TRACK_PENDING: 'POST_TRACK_PENDING',

  ADD_TRACK: 'ADD_TRACK',

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

  loadTracks: (logId) => ({
    type: tracklistActions.LOAD_TRACKS,
    payload: {
      logId
    }
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

  addTrack: (logId, data) => ({
    type: tracklistActions.ADD_TRACK,
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

export const tracklistPostActions = {
  failed: tracklistActions.postTrackFailed,
  fulfilled: tracklistActions.postTrackFulfilled,
  pending: tracklistActions.postTrackPending
}
