import { call, take, fork, takeLatest } from 'redux-saga/effects'
import { appActions } from './actions'

import { postIdentity, fetchPrivateKey } from '@core/api'

import history from '@core/history'

export function * watchInitApp () {
  while (true) {
    const { payload } = yield take(appActions.INIT_APP)
    // TODO: handle error on ipfs initialization
  }
}

export function * getPrivateKey () {
  yield call(fetchPrivateKey)
}

export function * setIdentity ({ payload } ) {
  yield call(postIdentity, payload)
}

export function * goBack () {
  yield call(history.goBack)
}

export function * watchGetPrivateKey () {
  yield takeLatest(appActions.GET_PRIVATE_KEY, getPrivateKey)
}

export function * watchSetIdentity () {
  yield takeLatest(appActions.SET_IDENTITY, setIdentity)
}

export const appSagas = [
  fork(watchInitApp),
  fork(watchGetPrivateKey),
  fork(watchSetIdentity)
]
