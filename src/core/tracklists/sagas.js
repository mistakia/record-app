import { call, fork, put, select, takeLatest } from 'redux-saga/effects'
import { push } from 'react-router-redux'

import { getApp } from '@core/app'
import { fetchTracks, postTrack } from '@core/api'
import { ITEMS_PER_LOAD } from '@core/constants'
import { tracklistActions } from './actions'
import { getCurrentTracklist } from './selectors'
import { getCurrentSelectedTags } from '@core/taglists'

export function * loadTracks ({ payload = {} }) {
  const { logId, tags } = payload
  const params = { start: 0, end: ITEMS_PER_LOAD, tags }
  yield call(fetchTracks, { logId, params })
}

export function * toggleTag ({ payload }) {
  const { tag } = payload
  const tracklist = yield select(getCurrentTracklist)
  const logId = tracklist.id
  let selectedTags = yield select(getCurrentSelectedTags)

  if (selectedTags.includes(tag)) {
    selectedTags.splice(selectedTags.indexOf(tag), 1)
  } else {
    selectedTags.push(tag)
  }

  yield put(tracklistActions.loadTracks(logId, selectedTags))
}

export function * loadNextTracks () {
  const tracklist = yield select(getCurrentTracklist)
  const start = tracklist.trackIds.size
  const tags = yield select(getCurrentSelectedTags)
  const params = { start, end: start + ITEMS_PER_LOAD, tags }
  yield call(fetchTracks, { logId: tracklist.id, params })
}

export function * addTrack ({ payload }) {
  const { logId, data } = payload
  yield call(postTrack, { logId, data })
}

export function * goToTracks () {
  const app = yield select(getApp)
  yield put(push(`/tracks${app.address}`))
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function * watchLoadTracks () {
  yield takeLatest(tracklistActions.LOAD_TRACKS, loadTracks)
}

export function * watchToggleTag () {
  yield takeLatest(tracklistActions.TOGGLE_TAG, toggleTag)
}

export function * watchLoadNextTracks () {
  yield takeLatest(tracklistActions.LOAD_NEXT_TRACKS, loadNextTracks)
}

export function * watchAddTrack () {
  yield takeLatest(tracklistActions.ADD_TRACK, addTrack)
}

export function * watchAddTrackFulfilled () {
  yield takeLatest(tracklistActions.POST_TRACK_FULFILLED, goToTracks)
}

//= ====================================
//  ROOT
// -------------------------------------

export const tracklistSagas = [
  fork(watchLoadTracks),
  fork(watchToggleTag),
  fork(watchLoadNextTracks),
  fork(watchAddTrack),
  fork(watchAddTrackFulfilled)
]
