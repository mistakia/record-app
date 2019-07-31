export const trackActions = {
  TRACK_ADDED: 'TRACK_ADDED',
  CLEAR: 'CLEAR',

  clearTracks: (trackId) => ({
    type: trackActions.CLEAR,
    payload: {
      trackId
    }
  })
}
