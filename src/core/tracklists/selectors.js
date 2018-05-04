import { createSelector } from 'reselect'

import { getTracks } from '@core/tracks/selectors'

export function getTracklists(state) {
  return state.tracklists
}

export function getTracklistById(state, tracklistId) {
  return getTracklists(state).get(tracklistId)
}

export function getCurrentTracklist(state) {
  let tracklists = getTracklists(state)
  return tracklists.get(tracklists.get('currentTracklistId'))
}

//=====================================
//  MEMOIZED SELECTORS
//-------------------------------------

export const getCurrentTrackIds = createSelector(
  getCurrentTracklist,
  tracklist => tracklist.trackIds
)

export const getTracksForCurrentTracklist = createSelector(
  getCurrentTrackIds,
  getTracks,
  (trackIds, tracks) => {
    return trackIds.map(id => tracks.get(id))
  }
)
