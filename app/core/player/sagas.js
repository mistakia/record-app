import { eventChannel } from 'redux-saga'
import { call, fork, put, select, take } from 'redux-saga/effects'
import { LOCATION_CHANGE } from 'react-router-redux'

import { appActions, getApp } from '@core/app'
import { fetchPlayerTracks, fetchShuffleTracks, postListen } from '@core/api'
import { PLAYER_INITIAL_VOLUME, ITEMS_PER_LOAD } from '@core/constants'
import { getTracklistByAddress, getCurrentSelectedTags } from '@core/tracklists'
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
    tracklistTrackIds,
    tracklistCursorId,
    tracklistHasMore,
    tracklistAddress,
    shuffleTrackIds,
    isShuffling,
    tracklistTags,
    tracklistQuery,
    repeat,
    tracklistStartIndex
  } = yield select(getPlayer)

  if (repeat === 1) {
    yield put(playerActions.togglePlayRepeat())
  }

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
      yield call(fetchPlayerTracks, { logAddress: tracklistAddress, params })
    }
  } else if (shuffleTrackIds.size < 3) {
    // TODO: reload shuffle without replacement
    const params = {
      shuffle: true,
      tags: tracklistTags.toJS(),
      query: tracklistQuery,
      limit: 18
    }
    yield call(fetchShuffleTracks, { logAddress: tracklistAddress, params })
  }
}

export function * playNextTrack () {
  const repeat = yield select(getPlayerRepeat)
  const cursor = yield select(getPlayerTracklistCursor)

  if (repeat === 1) {
    yield put(playerActions.playTrack(cursor.selectedTrackId))
  } else if (cursor.nextTrackId) {
    yield put(playerActions.playTrack(cursor.nextTrackId))
  }
}

export function * shuffleTracklist ({ tracklistAddress }) {
  const tracklist = yield select(getTracklistByAddress, tracklistAddress)
  const { query } = tracklist
  const tags = yield select(getCurrentSelectedTags)
  const params = { shuffle: true, tags, query, limit: 20 }
  yield put(playerActions.shuffleTracklist({
    tracklistAddress,
    query,
    tags
  }))
  yield call(fetchShuffleTracks, { logAddress: tracklistAddress, params })
  const { shuffleTrackIds } = yield select(getPlayer)
  if (shuffleTrackIds.size) yield call(playAudio)
}

export function * playTracklist ({ trackId, tracklistAddress }) {
  const tracklist = yield select(getTracklistByAddress, tracklistAddress)
  const startIndex = tracklist.trackIds.indexOf(trackId)
  const tags = yield select(getCurrentSelectedTags)
  const { hasMore, query } = tracklist
  yield put(playerActions.playTracklist({
    trackId,
    tracklistAddress,
    trackIds: tracklist.trackIds,
    startIndex,
    hasMore,
    tags,
    query
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
    logAddress: app.address,
    data: {
      logAddress: tracklistAddress,
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

export function * watchPlayPrevious () {
  while (true) {
    yield take(playerActions.PLAY_PREVIOUS)
    yield fork(playAudio)
  }
}

export function * watchPlayTrack () {
  while (true) {
    yield take(playerActions.PLAY_TRACK)
    yield fork(playAudio)
    yield fork(playTrack)
  }
}

export function * watchPlayQueueTrack () {
  while (true) {
    yield take(playerActions.PLAY_QUEUE_TRACK)
    yield fork(playAudio)
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
  fork(watchAudioEnded),
  fork(watchAudioVolumeChanged),
  fork(watchInitApp),
  fork(watchPlayTrack),
  fork(watchPlayPrevious),
  fork(watchPlayQueueTrack),
  fork(watchPlayTracklist),
  fork(watchPlaySelectedTrack),
  fork(watchShuffleTracklist),
  fork(watchLocationChange)
]
