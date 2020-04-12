import { getTracklistById, getTracklistCursor } from '@core/tracklists'
import { getTrackById } from '@core/tracks'
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

export function getPlayerIsPlayingFromQueue (state) {
  return getPlayer(state).isPlayingFromQueue
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

export function getPlayerTracklistCursorId (state) {
  return getPlayer(state).tracklistCursorId
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

export function getPlayerTracklistCursor (state) {
  const queue = getPlayerQueue(state)
  const tracklistCursorId = getPlayerTracklistCursorId(state)
  const trackId = getPlayerTrackId(state)
  const tracklist = getPlayerTracklist(state)
  const cursor = tracklist ? getTracklistCursor(tracklistCursorId, tracklist.trackIds) : {}
  const isPlayingFromQueue = getPlayerIsPlayingFromQueue(state)

  return {
    selectedTrackId: trackId,
    nextTrackId: queue.size ? queue.first() : cursor.nextTrackId,
    previousTrackId: !(isPlayingFromQueue && queue.size) && cursor.previousTrackId
  }
}

export function getPlayerTracklistContact (state) {
  const tracklistId = getPlayerTracklistId(state)
  return getContactByAddress(state, tracklistId)
}
