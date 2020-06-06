import { List } from 'immutable'
import { eventChannel } from 'redux-saga'
import { call, fork, put, select, take, takeLatest } from 'redux-saga/effects'
import { LOCATION_CHANGE } from 'react-router-redux'

import { appActions, getApp } from '@core/app'
import { fetchPlayerTracks, fetchShuffleTracks, postListen } from '@core/api'
import { PLAYER_INITIAL_VOLUME, ITEMS_PER_LOAD } from '@core/constants'
import { getCurrentTracklist } from '@core/tracklists'
import { playerActions } from './actions'
import { audio, initAudio, setVolume } from '@core/audio'
import {
  getPlayer,
  getPlayerRepeat,
  getPlayerTrack,
  getPlayerTracklistCursor,
  getPlayerTracklistAddress
} from './selectors'
import { playerStorage } from './storage'

export function * playTrack () {
  const {
    tracklistCursorId,
    tracklist,
    isShuffling,
    tracklistStartIndex
  } = yield select(getPlayer)

  const { query, sort, order } = tracklist
  const addresses = tracklist.addresses.toJS()
  const tags = tracklist.tags.toJS()
  const trackIds = tracklist.get('trackIds')

  if (!isShuffling) {
    const cursorIndex = trackIds.indexOf(tracklistCursorId)
    const tracksRemaining = trackIds.size - cursorIndex

    if (tracklist.hasMore && tracksRemaining < 3) {
      const start = trackIds.size + tracklistStartIndex
      const params = {
        start,
        addresses,
        tags,
        sort,
        order,
        query,
        limit: ITEMS_PER_LOAD
      }
      yield call(fetchPlayerTracks, { params })
    }
  } else if (trackIds.size < 3) {
    // TODO: reload shuffle without replacement
    const params = { shuffle: true, limit: 18, tags, query, addresses }
    yield call(fetchShuffleTracks, { params })
  }
}

export function * onAudioEnded () {
  const repeat = yield select(getPlayerRepeat)
  const cursor = yield select(getPlayerTracklistCursor)

  if (repeat === 1) {
    yield put(playerActions.playTrack(cursor.selectedTrackId))
  } else if (cursor.nextTrackId) {
    yield put(playerActions.playTrack(cursor.nextTrackId))
  }
}

export function * shuffleTracklist ({ tracklistAddress }) {
  let tracklist = yield select(getCurrentTracklist)
  tracklist = tracklist.set('trackIds', new List())
  yield put(playerActions.shuffleTracklist({
    tracklist,
    tracklistAddress
  }))
  const { query } = tracklist
  const addresses = tracklist.addresses.toJS()
  const tags = tracklist.tags.toJS()
  const params = { shuffle: true, limit: 20, tags, query, addresses }
  yield call(fetchShuffleTracks, { params })
  const player = yield select(getPlayer)
  if (player.tracklist.trackIds.size) yield call(playAudio)
}

export function * playTracklist ({ trackId, tracklistAddress }) {
  const tracklist = yield select(getCurrentTracklist)
  const startIndex = tracklist.trackIds.indexOf(trackId)
  yield put(playerActions.playTracklist({
    trackId,
    tracklist,
    startIndex,
    tracklistAddress
  }))
}

export function * playAudio () {
  const track = yield select(getPlayerTrack)
  yield call(audio.load, `${track.url}?trackId=${track.id}`)
  yield call(audio.play)

  // record listens only after track loads
  yield take(playerActions.AUDIO_PLAYING)

  // probably an anti-pattern but need to exclude stale saga effects
  const nowplaying = yield select(getPlayerTrack)
  if (track.id !== nowplaying.id) {
    return
  }

  const app = yield select(getApp)
  const tracklistAddress = yield select(getPlayerTracklistAddress)
  yield call(postListen, {
    address: app.address,
    data: {
      address: tracklistAddress,
      trackId: track.id,
      cid: track.contentCID
    }
  })
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

export function * hideQueue () {
  const { isQueueVisible } = yield select(getPlayer)
  if (isQueueVisible) yield put(playerActions.toggleQueue())
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function * watchAudioEnded () {
  while (true) {
    yield take(playerActions.AUDIO_ENDED)
    yield fork(onAudioEnded)
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

export function * watchPlay () {
  yield takeLatest([
    playerActions.PLAY_PREVIOUS,
    playerActions.PLAY_TRACKLIST,
    playerActions.PLAY_QUEUE_TRACK,
    playerActions.PLAY_PLAYER_TRACKLIST_TRACK
  ], playAudio)
}

export function * watchPlayTrack () {
  while (true) {
    yield take([playerActions.PLAY_TRACK, playerActions.PLAY_NEXT])
    yield fork(playAudio)
    yield fork(playTrack)
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

export function * watchLocationChange () {
  while (true) {
    yield take(LOCATION_CHANGE)
    yield fork(hideQueue)
  }
}

//= ====================================
//  ROOT
// -------------------------------------

export const playerSagas = [
  fork(watchPlay),
  fork(watchAudioEnded),
  fork(watchAudioVolumeChanged),
  fork(watchInitApp),
  fork(watchPlayTrack),
  fork(watchPlaySelectedTrack),
  fork(watchShuffleTracklist),
  fork(watchLocationChange)
]
