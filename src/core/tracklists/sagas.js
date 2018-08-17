import { call, fork, put, select, takeLatest } from 'redux-saga/effects'
import { push } from 'react-router-redux'

import { fetchTracks, postTrack } from '@core/api'
import { ITEMS_PER_LOAD } from '@core/constants'
import { tracklistActions } from './actions'
import { getCurrentTracklist } from './selectors'

export function * loadTracks ({ payload = {} }) {
  const logId = payload.logId || '/me'
  const params = { start: 0, limit: ITEMS_PER_LOAD }
  yield call(fetchTracks, { logId, params })
}

export function * loadNextTracks () {
  const tracklist = yield select(getCurrentTracklist)
  const start = tracklist.trackIds.size
  const params = { start, limit: start + ITEMS_PER_LOAD }
  yield call(fetchTracks, { logId: tracklist.id, params })
}

export function * addTrack ({ payload }) {
  const { logId, data } = payload
  yield call(postTrack, { logId, data })
}

export function * goToTracks () {
  yield put(push('/tracks/me'))
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function * watchLoadTracks () {
  yield takeLatest(tracklistActions.LOAD_TRACKS, loadTracks)
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
  fork(watchLoadNextTracks),
  fork(watchAddTrack),
  fork(watchAddTrackFulfilled)
]
