import { createSelector } from 'reselect'

import { getTracklistByAddress } from '@core/tracklists'
import { getTracks, getTrackById } from '@core/tracks'
import { getLogByAddress } from '@core/logs'

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
  const { trackId, tracklistTrackIds, shuffleTrackIds, queue, history } = getPlayer(state)
  return tracklistTrackIds.merge(shuffleTrackIds, queue, history).push(trackId)
}

export function getPlayerQueue (state) {
  return getPlayer(state).queue
}

export function getPlayerTracklistAddress (state) {
  return getPlayer(state).tracklistAddress
}

export function getPlayerTrack (state) {
  const trackId = getPlayerTrackId(state)
  return getTrackById(state, trackId)
}

export function getPlayerTracklist (state) {
  const tracklistAddress = getPlayerTracklistAddress(state)
  return getTracklistByAddress(state, tracklistAddress)
}

export function getPlayerTracklistRemaining (state) {
  const { tracklistCursorId, tracklistTrackIds } = getPlayer(state)
  const index = tracklistTrackIds.indexOf(tracklistCursorId)
  return tracklistTrackIds.size - index
}

export function getPlayerTracklistCursor (state) {
  const {
    queue,
    repeat,
    history,
    tracklistCursorId,
    trackId,
    shuffleTrackIds,
    isShuffling,
    tracklistTrackIds
  } = getPlayer(state)

  if (!trackId) {
    return {}
  }

  const lastPlayedTrackId = history.first()

  if (isShuffling && !queue.size) {
    return {
      selectedTrackId: trackId,
      nextTrackId: shuffleTrackIds.first(),
      previousTrackId: lastPlayedTrackId
    }
  }

  const index = tracklistTrackIds.indexOf(tracklistCursorId)
  let nextTrackId = null
  let previousTrackId = null

  if (index !== -1) {
    if (index < tracklistTrackIds.size - 1) nextTrackId = tracklistTrackIds.get(index + 1)
    if (index > 0) previousTrackId = tracklistTrackIds.get(index - 1)
  }

  if (repeat > 0 && !nextTrackId) {
    nextTrackId = tracklistTrackIds.first()
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
  return getLogByAddress(state, tracklistAddress)
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
