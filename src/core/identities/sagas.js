import { takeLatest, call, fork, select } from 'redux-saga/effects'

import { identityActions } from './actions'
import { getIdentityById } from './selectors'

export function* loadIdentity({payload}) {
  const { id } = payload
  const identity = yield select(getIdentityById, id)

  if (!identity) {
    //TODO
    //yield call(fetchIdentity, id)
  }
}

export function* watchLoadIdentity() {
  yield* takeLatest(identityActions.LOAD_IDENTITY, loadIdentity)
}

export const identitySagas = [
  fork(watchLoadIdentity)
]
