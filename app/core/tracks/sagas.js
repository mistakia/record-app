import { fork, takeLatest, select, call, put } from 'redux-saga/effects'

import { trackActions } from './actions'
import { goToTracks, getPendingTrackCID, tracklistActions } from '@core/tracklists'
import { feedActions } from '@core/feed'
import { getPlayerTrack } from '@core/player'

export function * trackAdded ({ payload }) {
  const contentCID = yield select(getPendingTrackCID)
  if (payload.track.payload.value.contentCID !== contentCID) {
    yield call(goToTracks)
  }
}

export function * clearTracks () {
  const track = yield select(getPlayerTrack)
  const action = trackActions.clearTracks(track ? track.id : null)
  yield put(action)
}

export function * watchTrackAdded () {
  yield takeLatest(trackActions.TRACK_ADDED, trackAdded)
}

export function * watchLoadTracks () {
  yield takeLatest(tracklistActions.LOAD_TRACKS, clearTracks)
}

export function * watchLoadFeed () {
  yield takeLatest(feedActions.LOAD_FEED, clearTracks)
}

export const trackSagas = [
  fork(watchTrackAdded),
  fork(watchLoadTracks),
  fork(watchLoadFeed)
]
