import { createSelector } from 'reselect'

import { getTracks, getTrackById } from '@core/tracks'
import { getLogByAddress } from '@core/logs'

export function getPlayer (state) {
  return state.get('player')
}

export function getPlayerRepeat (state) {
  return getPlayer(state).repeat
}

export function getPlayerTimes (state) {
  return state.get('playerTimes')
}

export function getPlayerTrackIds (state) {
  const { trackId, tracklist, queue, history } = getPlayer(state)
  const tracklistTrackIds = tracklist.get('trackIds')
  return tracklistTrackIds.merge(queue, history).push(trackId)
}

export function getPlayerQueue (state) {
  return getPlayer(state).queue
}

export function getPlayerTracklistAddress (state) {
  return getPlayer(state).tracklistAddress
}

export function getPlayerTrack (state) {
  const { trackId } = getPlayer(state)
  return getTrackById(state, trackId)
}

export function getPlayerTracklist (state) {
  return getPlayer(state).tracklist
}

export function getPlayerTracklistRemaining (state) {
  const { tracklistCursorId, tracklist } = getPlayer(state)
  const index = tracklist.get('trackIds').indexOf(tracklistCursorId)
  return tracklist.get('trackIds').size - index
}

export function getPlayerTracklistCursor (state) {
  const {
    queue,
    repeat,
    history,
    tracklistCursorId,
    trackId,
    tracklist,
    isShuffling
  } = getPlayer(state)

  if (!trackId) {
    return {}
  }

  const trackIds = tracklist.get('trackIds')
  const lastPlayedTrackId = history.first()

  if (isShuffling && !queue.size) {
    return {
      selectedTrackId: trackId,
      nextTrackId: trackIds.first(),
      previousTrackId: lastPlayedTrackId
    }
  }

  const index = trackIds.indexOf(tracklistCursorId)
  let nextTrackId = null
  let previousTrackId = null

  if (index !== -1) {
    if (index < trackIds.size - 1) nextTrackId = trackIds.get(index + 1)
    if (index > 0) previousTrackId = trackIds.get(index - 1)
  }

  if (repeat === 2 && !nextTrackId) {
    nextTrackId = trackIds.first()
  }

  return {
    selectedTrackId: trackId,
    nextTrackId: queue.size ? queue.first() : nextTrackId,
    previousTrackId: lastPlayedTrackId,
    tracklistPreviousTrackId: previousTrackId
  }
}

export function getPlayerTracklistLog (state) {
  const tracklistAddress = getPlayerTracklistAddress(state)
  if (!tracklistAddress) {
    return null
  }
  return getLogByAddress(state, tracklistAddress)
}

//= ====================================
//  MEMOIZED SELECTORS
// -------------------------------------

export const getTracksForPlayerTracklist = createSelector(
  getPlayerTracklist,
  (state) => getTracks(state),
  (tracklist, tracks) => {
    return tracklist.trackIds.map(id => tracks.get(id))
  }
)

export const getTracksForQueue = createSelector(
  getPlayerQueue,
  (state) => getTracks(state),
  (trackIds, tracks) => {
    return trackIds.map(id => tracks.get(id))
  }
)
