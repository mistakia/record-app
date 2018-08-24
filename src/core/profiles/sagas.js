import { call, fork, takeLatest } from 'redux-saga/effects'

import history from '@core/history'
import { fetchProfile, postProfile } from '@core/api'
import { profileActions } from './actions'

export function * loadProfile ({ payload = {} }) {
  const { logId } = payload
  yield call(fetchProfile, { logId })
}

export function * setProfile ({ payload }) {
  const { data } = payload
  yield call(postProfile, { data })
}

export function * goBack () {
  yield call(history.goBack)
}

export function * watchLoadProfile () {
  yield takeLatest(profileActions.LOAD_PROFILE, loadProfile)
}

export function * watchSetProfile () {
  yield takeLatest(profileActions.SET_PROFILE, setProfile)
}

export function * watchSetProfileFulfilled () {
  yield takeLatest(profileActions.POST_PROFILE_FULFILLED, goBack)
}

export const profileSagas = [
  fork(watchLoadProfile),
  fork(watchSetProfile),
  fork(watchSetProfileFulfilled)
]
