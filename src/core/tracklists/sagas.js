import { call, fork, put, takeLatest } from 'redux-saga/effects'
import { push } from 'react-router-redux'

import { fetchTracks, postTrack } from '@core/api'
import { tracklistActions } from './actions'

export function * loadTracks ({payload}) {
  const { logId } = payload
  yield call(fetchTracks, logId)
}

export function * addTrack ({ payload }) {
  const { logId, data } = payload
  yield call(postTrack, logId, data)
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
  fork(watchAddTrack),
  fork(watchAddTrackFulfilled)
]
