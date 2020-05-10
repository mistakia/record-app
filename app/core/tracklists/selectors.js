import { createSelector } from 'reselect'

import { getLogByAddress } from '@core/logs'
import { getTracks } from '@core/tracks'

export function getTracklists (state) {
  return state.get('tracklists')
}

export function getTracklistByAddress (state, logAddress) {
  return getTracklists(state).get(logAddress)
}

export function getCurrentTracklistAddress (state) {
  const tracklists = getTracklists(state)
  return tracklists.get('currentTracklistAddress')
}

export function getCurrentTracklist (state) {
  let tracklists = getTracklists(state)
  return tracklists.get(tracklists.get('currentTracklistAddress'))
}

export function getCurrentTracklistLog (state) {
  const logAddress = getCurrentTracklistAddress(state)
  return getLogByAddress(state, logAddress)
}

export function getCurrentSelectedTags (state) {
  const logAddress = getCurrentTracklistAddress(state)
  return getTracklistByAddress(state, logAddress).tags.toJS()
}

//= ====================================
//  MEMOIZED SELECTORS
// -------------------------------------

export const getCurrentTracklistIsUpdating = createSelector(
  getCurrentTracklist,
  tracklist => tracklist.isUpdating
)

export const getCurrentTrackIds = createSelector(
  getCurrentTracklist,
  tracklist => (tracklist.query || tracklist.tags.size) ? tracklist.filteredTrackIds : tracklist.trackIds
)

export const getTracksForCurrentTracklist = createSelector(
  getCurrentTrackIds,
  (state) => getTracks(state), // FIX for https://stackoverflow.com/questions/35240716/webpack-import-returns-undefined-depending-on-the-order-of-imports
  (trackIds, tracks) => {
    return trackIds.map(id => tracks.get(id))
  }
)
