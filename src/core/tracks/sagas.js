import { fork, takeLatest, select, call } from 'redux-saga/effects'

import { trackActions } from './actions'
import { goToTracks, getPendingTrackCID } from '@core/tracklists'

export function * trackAdded ({ payload }) {
  const contentCID = yield select(getPendingTrackCID)
  if (payload.track.payload.value.contentCID !== contentCID) {
    yield call(goToTracks)
  }
}

export function * watchTrackAdded () {
  yield takeLatest(trackActions.TRACK_ADDED, trackAdded)
}

export const trackSagas = [
  fork(watchTrackAdded)
]
