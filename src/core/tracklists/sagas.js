import { call, fork, select, takeLatest } from 'redux-saga/effects'
import { fetchTracks } from '@core/api'
import { tracklistActions } from './actions'
import { getTracklistById } from './selectors'

export function* loadTracks({payload}) {
  const { tracklistId } = payload
  const tracklist = yield select(getTracklistById, tracklistId);
  if (tracklist && tracklist.isNew) {
    yield call(fetchTracks, tracklistId)
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
    
