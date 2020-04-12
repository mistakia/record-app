export const trackActions = {
  TRACK_ADDED: 'TRACK_ADDED',
  CLEAR: 'CLEAR',

  clearTracks: (trackIds) => ({
    type: trackActions.CLEAR,
    payload: {
      trackIds
    }
  })
}
