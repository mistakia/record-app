import { call, fork, put, select, takeLatest } from 'redux-saga/effects'
import { push } from 'react-router-redux'
import queryString from 'query-string'

import { fetchTracks, postTrack, deleteTrack } from '@core/api'
import { ITEMS_PER_LOAD } from '@core/constants'
import { tracklistActions } from './actions'
import { getCurrentTracklist, getCurrentSelectedTags } from './selectors'
import history from '@core/history'

export function * addTrack ({ payload }) {
  const { logAddress, data } = payload
  yield call(postTrack, { logAddress, data })
}

export function * loadNextTracks () {
  const tracklist = yield select(getCurrentTracklist)
  const start = tracklist.trackIds.size
  const tags = yield select(getCurrentSelectedTags)
  const params = { start, limit: ITEMS_PER_LOAD, tags }
  yield call(fetchTracks, { logAddress: tracklist.address, params })
}

export function * loadTracks () {
  const { address, query } = yield select(getCurrentTracklist)
  const tags = yield select(getCurrentSelectedTags)

  const tracksPath = `/tracks${address}`
  if (history.location.pathname !== tracksPath) {
    return yield put(push(tracksPath + '?' + queryString.stringify({ tags, query })))
  }

  const params = { start: 0, limit: ITEMS_PER_LOAD, tags, query }
  yield call(fetchTracks, { logAddress: address, params })
}

export function * removeTrack ({ payload }) {
  const { logAddress, data } = payload
  yield call(deleteTrack, { logAddress, data })
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
