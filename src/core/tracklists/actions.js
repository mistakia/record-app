export const tracklistActions = {
  LOAD_TRACKS: 'LOAD_TRACKS',
  LOAD_NEXT_TRACKS: 'LOAD_NEXT_TRACKS',

  ADD_TRACK: 'ADD_TRACK',
  REMOVE_TRACK: 'REMOVE_TRACK',

  TOGGLE_TAG: 'TOGGLE_TAG',
  SEARCH_TRACKS: 'SEARCH_TRACKS',
  CLEAR_SEARCH: 'CLEAR_SEARCH',
  REORDER_TRACKLIST: 'REORDER_TRACKLIST',

  FETCH_TRACKS_FAILED: 'FETCH_TRACKS_FAILED',
  FETCH_TRACKS_FULFILLED: 'FETCH_TRACKS_FULFILLED',
  FETCH_TRACKS_PENDING: 'FETCH_TRACKS_PENDING',

  POST_TRACK_FAILED: 'POST_TRACK_FAILED',
  POST_TRACK_FULFILLED: 'POST_TRACK_FULFILLED',
  POST_TRACK_PENDING: 'POST_TRACK_PENDING',

  DELETE_TRACK_FAILED: 'DELETE_TRACK_FAILED',
  DELETE_TRACK_FULFILLED: 'DELETE_TRACK_FULFILLED',
  DELETE_TRACK_PENDING: 'DELETE_TRACK_PENDING',

  fetchTracksFailed: (address, error) => ({
    type: tracklistActions.FETCH_TRACKS_FAILED,
    payload: {
      address,
      error
    }
  }),

  fetchTracksFulfilled: (address, data) => ({
    type: tracklistActions.FETCH_TRACKS_FULFILLED,
    payload: {
      data,
      address
    }
  }),

  fetchTracksPending: address => ({
    type: tracklistActions.FETCH_TRACKS_PENDING,
    payload: {
      address
    }
  }),

  loadTracks: ({ path, addresses, tags, query, order, sort }) => ({
    type: tracklistActions.LOAD_TRACKS,
    payload: {
      path,
      addresses,
      tags,
      query,
      order,
      sort
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

  postTrackFailed: (address, error) => ({
    type: tracklistActions.POST_TRACK_FAILED,
    payload: {
      address,
      error
    }
  }),

  postTrackFulfilled: (address, data) => ({
    type: tracklistActions.POST_TRACK_FULFILLED,
    payload: {
      address,
      data
    }
  }),

  postTrackPending: address => ({
    type: tracklistActions.POST_TRACK_PENDING,
    payload: {
      address
    }
  }),

  addTrack: (address, data) => ({
    type: tracklistActions.ADD_TRACK,
    payload: {
      address,
      data
    }
  }),

  removeTrack: (address, data) => ({
    type: tracklistActions.REMOVE_TRACK,
    payload: {
      address,
      data
    }
  }),

  deleteTrackFailed: (address, error) => ({
    type: tracklistActions.DELETE_TRACK_FAILED,
    payload: {
      address,
      error
    }
  }),

  deleteTrackPending: address => ({
    type: tracklistActions.DELETE_TRACK_PENDING,
    payload: {
      address
    }
  }),

  deleteTrackFulfilled: (address, data) => ({
    type: tracklistActions.DELETE_TRACK_FULFILLED,
    payload: {
      address,
      data
    }
  }),

  clearSearch: () => ({
    type: tracklistActions.CLEAR_SEARCH
  }),

  searchTracks: (query) => ({
    type: tracklistActions.SEARCH_TRACKS,
    payload: {
      query
    }
  }),

  reorderTracklist: (sort) => ({
    type: tracklistActions.REORDER_TRACKLIST,
    payload: {
      sort
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
