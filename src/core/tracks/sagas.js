import { fork, takeLatest } from 'redux-saga/effects'

import { trackActions } from './actions'
import { goToTracks } from '@core/tracklists'

export function * watchTrackAdded () {
  yield takeLatest(trackActions.TRACK_ADDED, goToTracks)
}

export const trackSagas = [
  fork(watchTrackAdded)
]
