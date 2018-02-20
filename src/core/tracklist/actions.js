export const tracklistActions = {
  FETCH_TRACKS_FAILED: 'FETCH_TRACKS_FAILED',
  FETCH_TRACKS_FULFILLED: 'FETCH_TRACKS_FULFILLED',
  FETCH_TRACKS_PENDING: 'FETCH_TRACKS_PENDING',

  LOAD_TRACKS: 'LOAD_TRACKS',

  fetchTracksFailed: error => ({
    type: tracklistActions.FETCH_TRACKS_FAILED,
    payload: error
  }),

  fetchTracksPending: id => ({
    type: tracklistActions.FETCH_TRACKS_PENDING,
    payload: {
      id
    }
  }),

  fetchTracksFulfilled: (data) => ({
    type: tracklistActions.FETCH_TRACKS_FULFILLED,
    payload: data
  }),

  loadTracks: () => ({
    type: tracklistActions.LOAD_TRACKS
  })
}

export const tracklistRequestActions = {
  failed: tracklistActions.fetchTracksFailed,
  fulfilled: tracklistActions.fetchTracksFulfilled,
  pending: tracklistActions.fetchTracksPending
}
