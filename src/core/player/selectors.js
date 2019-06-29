import { getTracklistById, getTracklistCursor } from '@core/tracklists'
import { getTrackById } from '@core/tracks'

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

export function getPlayerTracklistCursor (state) {
  const trackId = getPlayerTrackId(state)
  const tracklist = getPlayerTracklist(state)
  if (tracklist) {
    return getTracklistCursor(trackId, tracklist.trackIds)
  }

  return {}
}
