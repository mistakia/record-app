import { createSelector } from 'reselect'

import { getTracklistById } from '@core/tracklists'
import { getTracks, getTrackById } from '@core/tracks'
import { getContactByAddress } from '@core/contacts'

export function getPlayer (state) {
  return state.get('player')
}

export function getPlayerIsPlaying (state) {
  return getPlayer(state).isPlaying
}

export function getPlayerIsShuffling (state) {
  return getPlayer(state).isShuffling
}

export function getPlayerIsLoading (state) {
  return getPlayer(state).isLoading
}

export function getPlayerTimes (state) {
  return state.get('playerTimes')
}

export function getPlayerTrackId (state) {
  return getPlayer(state).trackId
}

export function getPlayerTrackIds (state) {
  const { trackId, tracklistTrackIds, shuffleTrackIds, queue } = getPlayer(state)
  return tracklistTrackIds.merge(shuffleTrackIds, queue).push(trackId)
}

export function getPlayerQueue (state) {
  return getPlayer(state).queue
}

export function getPlayerTracklistId (state) {
  return getPlayer(state).tracklistId
}

export function getPlayerTrack (state) {
  const trackId = getPlayerTrackId(state)
  return getTrackById(state, trackId)
}

export function getPlayerTracklist (state) {
  const tracklistId = getPlayerTracklistId(state)
  return getTracklistById(state, tracklistId)
}

export function getPlayerTracklistRemaining (state) {
  const { tracklistCursorId, tracklistTrackIds } = getPlayer(state)
  const index = tracklistTrackIds.indexOf(tracklistCursorId)
  return tracklistTrackIds.size - index
}

export function getPlayerTracklistCursor (state) {
  const {
    queue,
    tracklistCursorId,
    trackId,
    shuffleTrackIds,
    isShuffling,
    isPlayingFromQueue,
    tracklistTrackIds
  } = getPlayer(state)

  if (!trackId) {
    return {}
  }

  if (isShuffling && !queue.size) {
    return {
      selectedTrackId: trackId,
      nextTrackId: shuffleTrackIds.first(),
      previousTrackId: null
    }
  }

  const index = tracklistTrackIds.indexOf(tracklistCursorId)
  let nextTrackId = null
  let previousTrackId = null

  if (index !== -1) {
    if (index < tracklistTrackIds.size - 1) nextTrackId = tracklistTrackIds.get(index + 1)
    if (index > 0) previousTrackId = tracklistTrackIds.get(index - 1)
  }

  return {
    selectedTrackId: trackId,
    nextTrackId: queue.size ? queue.first() : nextTrackId,
    previousTrackId: !(isPlayingFromQueue && queue.size) && previousTrackId
  }
}

export function getPlayerTracklistContact (state) {
  const tracklistId = getPlayerTracklistId(state)
  return getContactByAddress(state, tracklistId)
}

//= ====================================
//  MEMOIZED SELECTORS
// -------------------------------------

export const getTracksForQueue = createSelector(
  getPlayerQueue,
  (state) => getTracks(state),
  (trackIds, tracks) => {
    return trackIds.map(id => tracks.get(id))
  }
)
