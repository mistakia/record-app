import { take, fork, put, call } from 'redux-saga/effects'
import { push } from 'react-router-redux'
import { appActions } from './actions'

export function * goToInfo () {
  yield put(push('/info'))
}

export function * watchInitApp () {
  // TODO: update to takeLeading when released
  while (true) {
    const { payload } = yield take(appActions.INIT_APP)

    if (!payload) {
      yield call(goToInfo)
    }

    // TODO: handle error on ipfs initialization
  }
}

export const appSagas = [
  fork(watchInitApp)
]
