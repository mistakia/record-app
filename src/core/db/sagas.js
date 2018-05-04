import { takeLatest, fork, put, call } from 'redux-saga/effects'

import { dbActions } from '@core/db'
import { fetchInit } from '@core/api'

export function* initDB() {
  yield call(fetchInit)
}

export function* watchDB_INIT() {
  yield takeLatest(dbActions.DB_INIT, initDB)
}

export const dbSagas = [
  fork(watchDB_INIT)
]
