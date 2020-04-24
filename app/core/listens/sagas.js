import { call, select, fork, takeLatest } from 'redux-saga/effects'

import { listensActions } from './actions'
import { ITEMS_PER_LOAD, LISTENS_TRACKLIST_ADDRESS } from '@core/constants'
import { getCurrentTracklist } from '@core/tracklists'
import { fetchListens } from '@core/api'

export function * loadNextListens () {
  const tracklist = yield select(getCurrentTracklist)
  const start = tracklist.trackIds.size
  const params = { start, limit: ITEMS_PER_LOAD }
  yield call(fetchListens, { logAddress: tracklist.address, params })
}

export function * loadListens () {
  const params = { start: 0, limit: ITEMS_PER_LOAD }
  yield call(fetchListens, { logAddress: LISTENS_TRACKLIST_ADDRESS, params })
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

//= ====================================
//  ROOT
// -------------------------------------

export const listensSagas = [
  fork(watchLoadListens),
  fork(watchLoadNextListens)
]
