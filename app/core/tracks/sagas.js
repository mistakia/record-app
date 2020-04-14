import { fork, takeLatest, select, call, put } from 'redux-saga/effects'

import { trackActions } from './actions'
import { goToTracks, getPendingTrackCID, tracklistActions } from '@core/tracklists'
import { getPlayerTrackIds } from '@core/player'

export function * trackAdded ({ payload }) {
  const contentCID = yield select(getPendingTrackCID)
  if (payload.track.contentCID !== contentCID) {
    yield call(goToTracks)
  }
}

export function * clearTracks () {
  const trackIds = yield select(getPlayerTrackIds)
  yield put(trackActions.clearTracks(trackIds))
}

export function * watchTrackAdded () {
  yield takeLatest(trackActions.TRACK_ADDED, trackAdded)
}

export function * watchLoadTracks () {
  yield takeLatest(tracklistActions.LOAD_TRACKS, clearTracks)
}

export const trackSagas = [
  fork(watchTrackAdded),
  fork(watchLoadTracks)
]
