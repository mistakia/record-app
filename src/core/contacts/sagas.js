import { call, fork, takeLatest } from 'redux-saga/effects'

import { contactActions } from './actions'
import { fetchContact } from '@core/api'

export function * loadContact ({ payload = {} }) {
  const { logId } = payload
  yield call(fetchContact, { logId })
}

export function * watchLoadContact () {
  yield takeLatest(contactActions.LOAD_CONTACT, loadContact)
}

export const contactSagas = [
  fork(watchLoadContact)
]
