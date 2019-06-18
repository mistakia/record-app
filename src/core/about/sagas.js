import { call, fork, takeLatest } from 'redux-saga/effects'

import history from '@core/history'
import { postAbout } from '@core/api'
import { aboutActions } from './actions'

export function * setAbout ({ payload }) {
  const { data } = payload
  yield call(postAbout, { data })
}

export function * goBack () {
  yield call(history.goBack)
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
