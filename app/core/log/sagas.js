import { call, fork, takeLatest } from 'redux-saga/effects'

import { deleteLog } from '@core/api'
import { logActions } from './actions'

export function * removeLog ({ payload }) {
  const { logId } = payload
  yield call(deleteLog, { logId })
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function * watchDeleteLog () {
  yield takeLatest(logActions.DELETE_LOG, removeLog)
}

//= ====================================
//  ROOT
// -------------------------------------

export const logSagas = [
  fork(watchDeleteLog)
]
