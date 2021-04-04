import { fork, takeLatest, select, put } from 'redux-saga/effects'

import { trackActions } from './actions'
import { tracklistActions } from '@core/tracklists'
import { getPlayerTrackIds } from '@core/player'

export function * clearTracks () {
  const trackIds = yield select(getPlayerTrackIds)
  yield put(trackActions.clearTracks(trackIds))
}

export function * watchLoadTracks () {
  yield takeLatest(tracklistActions.LOAD_TRACKS, clearTracks)
}

export const trackSagas = [
  fork(watchLoadTracks)
]
