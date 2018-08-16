import { take, fork } from 'redux-saga/effects'
import { appActions } from './actions'

export function * watchInitApp () {
  while (true) {
    const { payload } = yield take(appActions.INIT_APP)
    // TODO: handle error on ipfs initialization
  }
}

export const appSagas = [
  fork(watchInitApp)
]
