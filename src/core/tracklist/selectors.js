import { createSelector } from 'reselect'
import { getTracks } from '@core/tracks'

export function getTracklist(state) {
  return state.tracklist
}

//=====================================
//  MEMOIZED SELECTORS
//-------------------------------------

export const getTrackIds = createSelector(
  getTracklist,
  tracklist => tracklist.trackIds
)

export const getCurrentTracklist = createSelector(
  getTrackIds,
  getTracks,
  (trackIds, tracks) => {
    return trackIds.map(id => tracks.get(id).toJS())
  }
)
