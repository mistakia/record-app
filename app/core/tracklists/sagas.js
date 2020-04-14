import { call, fork, put, select, takeLatest } from 'redux-saga/effects'
import { push } from 'react-router-redux'

import { getApp } from '@core/app'
import { fetchTracks, postTrack, deleteTrack } from '@core/api'
import { ITEMS_PER_LOAD } from '@core/constants'
import { tracklistActions } from './actions'
import { getCurrentTracklist } from './selectors'
import { getCurrentSelectedTags } from '@core/tracklists'

export function * addTrack ({ payload }) {
  const { logId, data } = payload
  yield call(postTrack, { logId, data })
}

export function * goToTracks () {
  const app = yield select(getApp)
  yield put(push(`/tracks${app.address}`))
}

export function * loadNextTracks () {
  const tracklist = yield select(getCurrentTracklist)
  const start = tracklist.trackIds.size
  const tags = yield select(getCurrentSelectedTags)
  const params = { start, end: start + ITEMS_PER_LOAD, tags }
  yield call(fetchTracks, { logId: tracklist.id, params })
}

export function * loadTracks () {
  const { id, query } = yield select(getCurrentTracklist)
  const tags = yield select(getCurrentSelectedTags)
  const params = { start: 0, end: ITEMS_PER_LOAD, tags, query }
  yield call(fetchTracks, { logId: id, params })
}

export function * removeTrack ({ payload }) {
  const { logId, data } = payload
  yield call(deleteTrack, { logId, data })
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function * watchAddTrack () {
  yield takeLatest(tracklistActions.ADD_TRACK, addTrack)
}

export function * watchLoadNextTracks () {
  yield takeLatest(tracklistActions.LOAD_NEXT_TRACKS, loadNextTracks)
}

export function * watchLoadTracks () {
  yield takeLatest(tracklistActions.LOAD_TRACKS, loadTracks)
}

export function * watchRemoveTrack () {
  yield takeLatest(tracklistActions.REMOVE_TRACK, removeTrack)
}

export function * watchSearchTracks () {
  yield takeLatest(tracklistActions.SEARCH_TRACKS, loadTracks)
}

export function * watchClearSearch () {
  yield takeLatest(tracklistActions.CLEAR_SEARCH, loadTracks)
}

export function * watchToggleTag () {
  yield takeLatest(tracklistActions.TOGGLE_TAG, loadTracks)
}

//= ====================================
//  ROOT
// -------------------------------------

export const tracklistSagas = [
  fork(watchAddTrack),
  fork(watchLoadNextTracks),
  fork(watchLoadTracks),
  fork(watchRemoveTrack),
  fork(watchSearchTracks),
  fork(watchClearSearch),
  fork(watchToggleTag)
]
