import { getTrackById } from '@core/tracks'
import { getLogByAddress } from '@core/logs'

export function getContextMenuInfo (state) {
  return state.get('contextMenu').toJS()
}

export function getContextMenuTrack (state) {
  const trackId = state.get('contextMenu').get('data').get('trackId')
  return getTrackById(state, trackId)
}

export function getContextMenuLog (state) {
  const address = state.get('contextMenu').get('data').get('address')
  return getLogByAddress(state, address)
}
