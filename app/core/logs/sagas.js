import { call, fork, takeLatest } from 'redux-saga/effects'

import { logActions } from './actions'
import {
  fetchLog,
  deleteLog,
  requestConnectLog,
  requestDisconnectLog
} from '@core/api'

export function * removeLog ({ payload }) {
  const { logAddress } = payload
  yield call(deleteLog, { logAddress })
}

export function * loadLog ({ payload = {} }) {
  const { logAddress } = payload
  yield call(fetchLog, { logAddress })
}

export function * connectLog ({ payload }) {
  const { logAddress } = payload
  yield call(requestConnectLog, { logAddress })
}

export function * disconnectLog ({ payload }) {
  const { logAddress } = payload
  yield call(requestDisconnectLog, { logAddress })
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function * watchDeleteLog () {
  yield takeLatest(logActions.DELETE_LOG, removeLog)
}

export function * watchLoadLog () {
  yield takeLatest(logActions.LOAD_LOG, loadLog)
}

export function * watchConnectLog () {
  yield takeLatest(logActions.CONNECT_LOG, connectLog)
}

export function * watchDisconnectLog () {
  yield takeLatest(logActions.DISCONNECT_LOG, disconnectLog)
}

//= ====================================
//  ROOT
// -------------------------------------

export const logsSagas = [
  fork(watchDeleteLog),
  fork(watchConnectLog),
  fork(watchDisconnectLog),
  fork(watchLoadLog)
]
