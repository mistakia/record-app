import { getTrackById } from '@core/tracks'

export function getContextMenuInfo (state) {
  return state.get('contextMenu').toJS()
}

export function getContextMenuTrack (state) {
  const trackId = state.get('contextMenu').trackId
  return getTrackById(state, trackId)
}
