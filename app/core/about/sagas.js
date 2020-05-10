import { call, fork, takeLatest, select, put } from 'redux-saga/effects'

import { postAbout } from '@core/api'
import { aboutActions } from './actions'
import { getApp, goBack } from '@core/app'
import { notificationActions } from '@core/notifications'

export function * setAbout ({ payload }) {
  const app = yield select(getApp)
  const { data } = payload
  yield call(postAbout, { logAddress: app.address, data })
}

export function * setAboutFailed () {
  yield put(notificationActions.show({
    text: 'Profile update failed',
    dismiss: 2000
  }))
}

export function * watchSetAbout () {
  yield takeLatest(aboutActions.SET_ABOUT, setAbout)
}

export function * watchSetAboutFulfilled () {
  yield takeLatest(aboutActions.POST_ABOUT_FULFILLED, goBack)
}

export function * watchSetAboutFailed () {
  yield takeLatest(aboutActions.POST_ABOUT_FAILED, setAboutFailed)
}

export const aboutSagas = [
  fork(watchSetAbout),
  fork(watchSetAboutFulfilled),
  fork(watchSetAboutFailed)
]
