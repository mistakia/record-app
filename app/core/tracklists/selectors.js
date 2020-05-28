import { createSelector } from 'reselect'

import { CURRENT_TRACKLIST_ADDRESS } from '@core/constants'
import { getLogByAddress } from '@core/logs'
import { getTracks } from '@core/tracks'

export function getTracklists (state) {
  return state.get('tracklists')
}

export function getCurrentTracklist (state) {
  return getTracklists(state).get(CURRENT_TRACKLIST_ADDRESS)
}

export function getCurrentTracklistLog (state) {
  const tracklist = getCurrentTracklist(state)
  if (!tracklist) {
    return null
  }

  const addresses = tracklist.get('addresses')
  return getLogByAddress(state, addresses.first())
}

//= ====================================
//  MEMOIZED SELECTORS
// -------------------------------------

export const getCurrentTrackIds = createSelector(
  getCurrentTracklist,
  tracklist => tracklist.trackIds
)

export const getTracksForCurrentTracklist = createSelector(
  getCurrentTrackIds,
  (state) => getTracks(state), // FIX for https://stackoverflow.com/questions/35240716/webpack-import-returns-undefined-depending-on-the-order-of-imports
  (trackIds, tracks) => {
    return trackIds.map(id => tracks.get(id))
  }
)
