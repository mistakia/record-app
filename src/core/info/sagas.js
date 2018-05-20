import { takeLatest, fork, put, call } from 'redux-saga/effects'

import { infoActions } from '@core/info'
import { fetchInfo } from '@core/api'

export function* initInfo() {
  yield call(fetchInfo)
}

export function* watchInfoInit() {
  yield takeLatest(infoActions.INFO_INIT, initInfo)
}

export const infoSagas = [
  fork(watchInfoInit)
]
