export function getTracks(state) {
  return state.get('tracks')
}

export function getTrackById(state, trackId) {
  return getTracks(state).get(trackId)
}
