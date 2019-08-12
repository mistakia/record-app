import { call, take, fork, put, takeLatest } from 'redux-saga/effects'
import { push } from 'react-router-redux'
import { appActions } from './actions'

import { postIdentity, fetchPrivateKey } from '@core/api'

import history from '@core/history'

export function * watchInitApp () {
  while (true) {
    const { payload } = yield take(appActions.INIT_APP)
    // TODO: handle error on ipfs initialization
  }
}

export function * goToInfo () {
  yield put(push('/info'))
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

export function * watchSetIdentityFulfilled () {
  yield takeLatest(appActions.SET_IDENTITY_FULFILLED, goToInfo)
}

export const appSagas = [
  fork(watchInitApp),
  fork(watchGetPrivateKey),
  fork(watchSetIdentity),
  fork(watchSetIdentityFulfilled)
]
