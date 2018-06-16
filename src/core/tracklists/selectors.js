import { createSelector } from 'reselect'

import { getTracks } from '@core/tracks'

export function getTracklists (state) {
  return state.get('tracklists')
}

export function getTracklistById (state, logId) {
  return getTracklists(state).get(logId)
}

export function getCurrentTracklist (state) {
  let tracklists = getTracklists(state)
  return tracklists.get(tracklists.get('currentTracklistId'))
}

export function getTracklistCursor(selectedTrackId, trackIds) {
  let index = trackIds.indexOf(selectedTrackId);
  let nextTrackId = null;
  let previousTrackId = null;

  if (index !== -1) {
    if (index < trackIds.size - 1) nextTrackId = trackIds.get(index + 1);
    if (index > 0) previousTrackId = trackIds.get(index - 1);
  }

  return {
    nextTrackId,
    previousTrackId,
    selectedTrackId
  };
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
  getTracks,
  (trackIds, tracks) => {
    return trackIds.map(id => tracks.get(id))
  }
)
