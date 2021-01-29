import { call, fork, put, select, takeLatest, takeEvery } from 'redux-saga/effects'

import { fetchTracks, postTrack, deleteTrack } from '@core/api'
import { ITEMS_PER_LOAD } from '@core/constants'
import { notificationActions } from '@core/notifications'
import { tracklistActions } from './actions'
import { getCurrentTracklist } from './selectors'

export function * addTrack ({ payload }) {
  const { address, data } = payload
  yield fork(postTrack, { address, data })
  yield put(notificationActions.show({
    text: 'Adding',
    dismiss: 2000
  }))
}

export function * loadNextTracks () {
  const tracklist = yield select(getCurrentTracklist)
  const { query, sort, order } = tracklist
  const addresses = tracklist.addresses.toJS()
  const tags = tracklist.tags.toJS()
  const start = tracklist.trackIds.size
  const params = { start, limit: ITEMS_PER_LOAD, tags, query, addresses, sort, order }
  yield call(fetchTracks, { address: tracklist.address, params })
}

export function * loadTracks () {
  const tracklist = yield select(getCurrentTracklist)
  const { query, sort, order } = tracklist
  const addresses = tracklist.addresses.toJS()
  const tags = tracklist.tags.toJS()
  const params = { start: 0, limit: ITEMS_PER_LOAD, tags, query, addresses, sort, order }
  yield call(fetchTracks, { params })
}

export function * reorderTracklist ({ payload }) {
  const { sort } = payload
  let tracklist = yield select(getCurrentTracklist)
  if (!tracklist.sort || sort !== tracklist.sort) {
    tracklist = tracklist.merge({
      sort,
      order: 'asc'
    })
  } else if (tracklist.order === 'asc') {
    tracklist = tracklist.merge({ order: 'desc' })
  } else {
    tracklist = tracklist.merge({ order: null, sort: null })
  }
  yield put(tracklistActions.loadTracks({ ...tracklist.toJS() }))
}

export function * removeTrack ({ payload }) {
  const { address, data } = payload
  yield call(deleteTrack, { address, data })
}

export function * postTrackFailed () {
  yield put(notificationActions.show({
    text: 'Failed to add track',
    severity: 'error',
    dismiss: 2000
  }))
}

export function * deleteTrackFailed () {
  yield put(notificationActions.show({
    text: 'Failed to remove track',
    severity: 'error',
    dismiss: 2000
  }))
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function * watchAddTrack () {
  yield takeEvery(tracklistActions.ADD_TRACK, addTrack)
}

export function * watchLoadNextTracks () {
  yield takeLatest(tracklistActions.LOAD_NEXT_TRACKS, loadNextTracks)
}

export function * watchLoadTracks () {
  yield takeLatest(tracklistActions.LOAD_TRACKS, loadTracks)
}

export function * watchRemoveTrack () {
  yield takeEvery(tracklistActions.REMOVE_TRACK, removeTrack)
}

export function * watchSearchTracks () {
  yield takeLatest(tracklistActions.SEARCH_TRACKS, loadTracks)
}

export function * watchClearSearch () {
  yield takeLatest(tracklistActions.CLEAR_SEARCH, loadTracks)
}

export function * watchToggleTag () {
  yield takeLatest(tracklistActions.TOGGLE_TAG, loadTracks)
}

export function * watchDeleteTrackFailed () {
  yield takeLatest(tracklistActions.DELETE_TRACK_FAILED, deleteTrackFailed)
}

export function * watchPostTrackFailed () {
  yield takeLatest(tracklistActions.POST_TRACK_FAILED, postTrackFailed)
}

export function * watchReorderTracklist () {
  yield takeLatest(tracklistActions.REORDER_TRACKLIST, reorderTracklist)
}

//= ====================================
//  ROOT
// -------------------------------------

export const tracklistSagas = [
  fork(watchAddTrack),
  fork(watchLoadNextTracks),
  fork(watchLoadTracks),
  fork(watchRemoveTrack),
  fork(watchSearchTracks),
  fork(watchClearSearch),
  fork(watchToggleTag),
  fork(watchReorderTracklist),

  fork(watchPostTrackFailed),
  fork(watchDeleteTrackFailed)
]
