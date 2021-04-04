import { call, put, fork, takeLatest, takeEvery } from 'redux-saga/effects'

import { logActions } from './actions'
import {
  fetchLog,
  deleteLog,
  requestConnectLog,
  requestDisconnectLog
} from '@core/api'
import { notificationActions } from '@core/notifications'

export function * removeLog ({ payload }) {
  const { address } = payload
  yield call(deleteLog, { address })
}

export function * loadLog ({ payload = {} }) {
  const { address } = payload
  yield call(fetchLog, { address })
}

export function * connectLog ({ payload }) {
  const { address } = payload
  yield call(requestConnectLog, { address })
}

export function * disconnectLog ({ payload }) {
  const { address } = payload
  yield call(requestDisconnectLog, { address })
}

export function * deleteLogFailed () {
  yield put(notificationActions.show({
    text: 'Failed to delete library',
    severity: 'error',
    dismiss: 2000
  }))
}

export function * connectLogFailed () {
  yield put(notificationActions.show({
    text: 'Could not connect to library',
    severity: 'error',
    dismiss: 2000
  }))
}

export function * disconnectLogFailed () {
  yield put(notificationActions.show({
    text: 'Could not disconnect from library',
    severity: 'error',
    dismiss: 2000
  }))
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function * watchDeleteLog () {
  yield takeLatest(logActions.DELETE_LOG, removeLog)
}

export function * watchLoadLog () {
  yield takeEvery(logActions.LOAD_LOG, loadLog)
}

export function * watchConnectLog () {
  yield takeLatest(logActions.CONNECT_LOG, connectLog)
}

export function * watchDisconnectLog () {
  yield takeLatest(logActions.DISCONNECT_LOG, disconnectLog)
}

export function * watchDeleteLogFailed () {
  yield takeLatest(logActions.DELETE_LOG_FAILED, deleteLogFailed)
}

export function * watchConnectLogFailed () {
  yield takeLatest(logActions.CONNECT_LOG_FAILED, connectLogFailed)
}

export function * watchDisconnectLogFailed () {
  yield takeLatest(logActions.DISCONNECT_LOG_FAILED, disconnectLogFailed)
}

//= ====================================
//  ROOT
// -------------------------------------

export const logsSagas = [
  fork(watchDeleteLog),
  fork(watchConnectLog),
  fork(watchDisconnectLog),
  fork(watchLoadLog),

  fork(watchDeleteLogFailed),
  fork(watchConnectLogFailed),
  fork(watchDisconnectLogFailed)
]
