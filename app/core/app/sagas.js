import { call, take, fork, put, takeLatest } from 'redux-saga/effects'
import { push } from 'react-router-redux'

import { appActions } from './actions'
import { logActions } from '@core/logs'
import { loglistActions } from '@core/loglists'
import { notificationActions } from '@core/notifications'
import { postIdentity, fetchPrivateKey } from '@core/api'

import history from '@core/history'

export function * watchInitApp () {
  while (true) {
    const { payload } = yield take(appActions.INIT_APP)
    // TODO: handle error on ipfs initialization
    if (payload.orbitdb.address) yield put(logActions.loadLog(payload.orbitdb.address))
    yield put(loglistActions.loadAllLogs())
  }
}

export function * goToInfo () {
  yield put(push('/info'))
}

export function * getPrivateKey () {
  yield call(fetchPrivateKey)
}

export function * setIdentity ({ payload }) {
  yield call(postIdentity, { privateKey: payload })
}

export function * goBack () {
  yield call(history.goBack)
}

export function * setIdentityFailed () {
  yield put(notificationActions.show({
    text: 'Could not load account',
    dismiss: 2000
  }))
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

export function * watchSetIdentityFailed () {
  yield takeLatest(appActions.SET_IDENTITY_FAILED, setIdentityFailed)
}

export const appSagas = [
  fork(watchInitApp),
  fork(watchGetPrivateKey),
  fork(watchSetIdentity),
  fork(watchSetIdentityFulfilled),

  fork(watchSetIdentityFailed)
]
