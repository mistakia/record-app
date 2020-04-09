import { call, fork, takeLatest, select } from 'redux-saga/effects'

import { postAbout } from '@core/api'
import { aboutActions } from './actions'
import { getApp, goBack } from '@core/app'

export function * setAbout ({ payload }) {
  const app = yield select(getApp)
  const { data } = payload
  yield call(postAbout, { logId: app.address, data })
}

export function * watchSetAbout () {
  yield takeLatest(aboutActions.SET_ABOUT, setAbout)
}

export function * watchSetAboutFulfilled () {
  yield takeLatest(aboutActions.POST_ABOUT_FULFILLED, goBack)
}

export const aboutSagas = [
  fork(watchSetAbout),
  fork(watchSetAboutFulfilled)
]
