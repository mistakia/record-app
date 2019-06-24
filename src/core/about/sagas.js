import { call, fork, takeLatest } from 'redux-saga/effects'

import { postAbout } from '@core/api'
import { aboutActions } from './actions'
import { goBack } from '@core/app'

export function * setAbout ({ payload }) {
  const { data } = payload
  yield call(postAbout, { data })
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
