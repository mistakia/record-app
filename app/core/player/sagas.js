import { eventChannel } from 'redux-saga'
import { call, fork, put, select, take } from 'redux-saga/effects'

import { appActions } from '@core/app'
import { fetchPlayerTracks, fetchShuffleTracks } from '@core/api'
import { PLAYER_INITIAL_VOLUME, ITEMS_PER_LOAD } from '@core/constants'
import { getTracklistById, getCurrentSelectedTags } from '@core/tracklists'
import { playerActions } from './actions'
import { audio, initAudio, setVolume } from '@core/audio'
import { getPlayer, getPlayerTrack, getPlayerTracklistCursor } from './selectors'
import { playerStorage } from './storage'

export function * playTrack () {
  const {
    tracklistTrackIds,
    tracklistCursorId,
    tracklistHasMore,
    tracklistId,
    shuffleTrackIds,
    isShuffling,
    tracklistTags,
    tracklistQuery,
    tracklistStartIndex
  } = yield select(getPlayer)

  if (!isShuffling) {
    const cursorIndex = tracklistTrackIds.indexOf(tracklistCursorId)
    const tracksRemaining = tracklistTrackIds.size - cursorIndex

    if (tracklistHasMore && tracksRemaining < 3) {
      const start = tracklistTrackIds.size + tracklistStartIndex
      const params = {
        start,
        tags: tracklistTags,
        query: tracklistQuery,
        end: start + ITEMS_PER_LOAD
      }
      yield call(fetchPlayerTracks, { logId: tracklistId, params })
    }
  } else if (shuffleTrackIds.size < 3) {
    // TODO
    /* const params = {
     *   shuffle: true,
     *   tags: tracklistTags,
     *   query: tracklistQuery,
     *   limit: 18
     * }
     * yield call(fetchShuffleTracks, { logId: tracklistId, params }) */
  }
}

export function * playNextTrack () {
  const cursor = yield select(getPlayerTracklistCursor)
  if (cursor.nextTrackId) {
    yield put(playerActions.playTrack(cursor.nextTrackId))
  }
}

export function * shuffleTracklist ({ tracklistId }) {
  const tracklist = yield select(getTracklistById, tracklistId)
  const { query } = tracklist
  const tags = yield select(getCurrentSelectedTags)
  const params = { shuffle: true, tags, query, limit: 20 }
  yield put(playerActions.shuffleTracklist({
    tracklistId,
    query,
    tags
  }))
  yield call(fetchShuffleTracks, { logId: tracklistId, params })
}

export function * playTracklist ({ trackId, tracklistId }) {
  const tracklist = yield select(getTracklistById, tracklistId)
  const startIndex = tracklist.trackIds.indexOf(trackId)
  const trackIds = tracklist.trackIds.slice(startIndex, 20)
  const tags = yield select(getCurrentSelectedTags)
  const { hasMore, query } = tracklist
  yield put(playerActions.playTracklist({
    trackId,
    tracklistId,
    trackIds,
    startIndex,
    hasMore,
    tags,
    query
  }))
}

export function * playAudio () {
  const track = yield select(getPlayerTrack)
  yield call(audio.load, track.url)
  yield call(audio.play)
}

export function * saveVolumeToStorage ({volume}) {
  yield call(playerStorage.setVolume, volume)
}

export function * setVolumeFromStorage () {
  let volume = yield call(playerStorage.getVolume)
  if (typeof volume !== 'number') volume = PLAYER_INITIAL_VOLUME
  yield call(setVolume, volume)
}

export function * subscribeToAudio () {
  const channel = yield call(eventChannel, initAudio)
  while (true) {
    let action = yield take(channel)
    yield put(action)
  }
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function * watchAudioEnded () {
  while (true) {
    yield take(playerActions.AUDIO_ENDED)
    yield fork(playNextTrack)
  }
}

export function * watchAudioVolumeChanged () {
  while (true) {
    const { payload } = yield take(playerActions.AUDIO_VOLUME_CHANGED)
    yield fork(saveVolumeToStorage, payload)
  }
}

export function * watchInitApp () {
  while (true) {
    yield take(appActions.INIT_APP)
    yield fork(subscribeToAudio)
    yield fork(setVolumeFromStorage)
  }
}

export function * watchPlayTrack () {
  while (true) {
    yield take(playerActions.PLAY_TRACK)
    yield fork(playAudio)
    yield fork(playTrack)
  }
}

export function * watchPlayTracklist () {
  while (true) {
    yield take(playerActions.PLAY_TRACKLIST)
    yield fork(playAudio)
  }
}

export function * watchPlaySelectedTrack () {
  while (true) {
    const { payload } = yield take(playerActions.PLAY_SELECTED_TRACK)
    yield fork(playTracklist, payload)
  }
}

export function * watchShuffleTracklist () {
  while (true) {
    const { payload } = yield take(playerActions.SHUFFLE_SELECTED_TRACKLIST)
    yield fork(shuffleTracklist, payload)
  }
}

export function * watchShuffleTracksFulfilled () {
  while (true) {
    yield take(playerActions.FETCH_PLAYER_SHUFFLE_FULFILLED)
    yield fork(playAudio)
  }
}

//= ====================================
//  ROOT
// -------------------------------------

export const playerSagas = [
  fork(watchAudioEnded),
  fork(watchAudioVolumeChanged),
  fork(watchInitApp),
  fork(watchPlayTrack),
  fork(watchPlayTracklist),
  fork(watchPlaySelectedTrack),
  fork(watchShuffleTracklist),
  fork(watchShuffleTracksFulfilled)
]
