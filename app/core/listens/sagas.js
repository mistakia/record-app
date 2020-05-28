import { call, put, select, fork, takeLatest } from 'redux-saga/effects'

import { listensActions } from './actions'
import { notificationActions } from '@core/notifications'
import { ITEMS_PER_LOAD } from '@core/constants'
import { getCurrentTracklist } from '@core/tracklists'
import { fetchListens } from '@core/api'

export function * loadNextListens () {
  const tracklist = yield select(getCurrentTracklist)
  const start = tracklist.trackIds.size
  const params = { start, limit: ITEMS_PER_LOAD }
  yield call(fetchListens, { params })
}

export function * loadListens () {
  const params = { start: 0, limit: ITEMS_PER_LOAD }
  yield call(fetchListens, { params })
}

export function * postListenFailed () {
  yield put(notificationActions.show({
    text: 'Failed to add track to listening history',
    dismiss: 2000
  }))
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function * watchLoadListens () {
  yield takeLatest(listensActions.LOAD_LISTENS, loadListens)
}

export function * watchLoadNextListens () {
  yield takeLatest(listensActions.LOAD_NEXT_LISTENS, loadNextListens)
}

export function * watchPostListenFailed () {
  yield takeLatest(listensActions.POST_LISTEN_FAILED, postListenFailed)
}

//= ====================================
//  ROOT
// -------------------------------------

export const listensSagas = [
  fork(watchLoadListens),
  fork(watchLoadNextListens),

  fork(watchPostListenFailed)
]
