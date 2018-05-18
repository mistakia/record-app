import { call, fork, select, takeLatest } from 'redux-saga/effects'
import { fetchTracks } from '@core/api'
import { tracklistActions } from './actions'
import { getTracklistById } from './selectors'

export function* loadTracks({payload}) {
  const { logId } = payload
  const tracklist = yield select(getTracklistById, logId);
  if (tracklist && tracklist.isNew) {
    yield call(fetchTracks, logId)
  }
}

//=====================================
//  WATCHERS
//-------------------------------------

export function* watchLoadTracks() {
  yield takeLatest(tracklistActions.LOAD_TRACKS, loadTracks)
}

//=====================================
//  ROOT
//-------------------------------------

export const tracklistSagas = [
  fork(watchLoadTracks)
]    
