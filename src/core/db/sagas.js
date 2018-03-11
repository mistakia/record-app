import { takeLatest, fork, put, call } from 'redux-saga/effects'

import { dbActions } from '@core/db'
import { fetchId } from '@core/api'

export function* initDB({ payload }) {
  yield call(fetchId, payload)
}

export function* watchDB_INIT() {
  yield takeLatest(dbActions.DB_INIT, initDB)
}

export const dbSagas = [
  fork(watchDB_INIT)
]
