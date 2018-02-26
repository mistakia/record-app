import { takeLatest, fork, put, call } from 'redux-saga/effects'

import { dbActions } from '@core/db'
import { init } from '@core/db/service'

export function* initDB({ payload }) {
  try {
    yield put(dbActions.initPending())
    const data = yield call(init, payload)
    yield put(dbActions.initFulfilled(data))
  } catch (error) {
    put(dbActions.initFailed(error))
  }
}

export function* watchDB_INIT() {
  yield takeLatest(dbActions.DB_INIT, initDB)
}

export const dbSagas = [
  fork(watchDB_INIT)
]
