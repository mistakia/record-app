import { eventChannel } from 'redux-saga'
import { call, fork, put, select, take } from 'redux-saga/effects'

import { appActions } from '@core/app'
import { fetchTracks, fetchTrack } from '@core/api'
import { PLAYER_INITIAL_VOLUME, ITEMS_PER_LOAD } from '@core/constants'
import { tracklistActions } from '@core/tracklists'
import { playerActions } from './actions'
import { audio, initAudio, setVolume } from '@core/audio'
import { getPlayer, getPlayerTrack, getPlayerTracklist, getPlayerTracklistCursor } from './selectors'
import { playerStorage } from './storage'

export function * playNextTrack () {
  const cursor = yield select(getPlayerTracklistCursor)
  if (cursor.nextTrackId) {
    yield put(playerActions.playSelectedTrack(cursor.nextTrackId))
  } else {
    const tracklist = yield select(getPlayerTracklist)
    const start = tracklist.trackIds.size
    const params = { start, end: start + ITEMS_PER_LOAD }
    yield call(fetchTracks, { logId: tracklist.id, params })
    const newCursor = yield select(getPlayerTracklistCursor)
    if (newCursor.nextTrackid) {
      yield put(playerActions.playSelectedTrack(newCursor.nextTrackId))
    }
  }
}

export function * shuffleTracklist ({ tracklistId }) {
  const params = { random: true }
  yield call(fetchTrack, { logId: tracklistId, params })
}

export function * playSelectedTrack () {
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
    const { isShuffling, tracklistId } = yield select(getPlayer)
    if (isShuffling) {
      yield fork(shuffleTracklist, { tracklistId })
    } else {
      yield fork(playNextTrack)
    }
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

export function * watchPlaySelectedTrack () {
  while (true) {
    yield take(playerActions.PLAY_SELECTED_TRACK)
    yield fork(playSelectedTrack)
  }
}

export function * watchShuffleTracklist () {
  while (true) {
    const { payload } = yield take(playerActions.SHUFFLE_TRACKLIST)
    yield fork(shuffleTracklist, payload)
  }
}

export function * watchTrackFulfilled () {
  while (true) {
    yield take(tracklistActions.FETCH_TRACK_FULFILLED)
    yield fork(playSelectedTrack)
  }
}

//= ====================================
//  ROOT
// -------------------------------------

export const playerSagas = [
  fork(watchAudioEnded),
  fork(watchAudioVolumeChanged),
  fork(watchInitApp),
  fork(watchPlaySelectedTrack),
  fork(watchShuffleTracklist),
  fork(watchTrackFulfilled)
]
