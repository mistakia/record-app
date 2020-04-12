import { fork, takeLatest, select, call, put } from 'redux-saga/effects'

import { trackActions } from './actions'
import { goToTracks, getPendingTrackCID, tracklistActions } from '@core/tracklists'
import { getPlayerTracklist } from '@core/player'

export function * trackAdded ({ payload }) {
  const contentCID = yield select(getPendingTrackCID)
  if (payload.track.contentCID !== contentCID) {
    yield call(goToTracks)
  }
}

export function * clearTracks () {
  const tracklist = yield select(getPlayerTracklist)
  const action = trackActions.clearTracks(tracklist ? tracklist.trackIds : null)
  yield put(action)
}

export function * watchTrackAdded () {
  yield takeLatest(trackActions.TRACK_ADDED, trackAdded)
}

export function * watchLoadTracks () {
  yield takeLatest(tracklistActions.LOAD_TRACKS, clearTracks)
}

export const trackSagas = [
  fork(watchTrackAdded),
  fork(watchLoadTracks),
]
