import { call, fork, takeLatest } from 'redux-saga/effects'

import { fetchContacts } from '@core/api'
import { contactlistActions } from './actions'

export function * loadContacts ({payload}) {
  const { logId } = payload
  yield call(fetchContacts, logId)
}

export function * watchLoadContacts () {
  yield takeLatest(contactlistActions.LOAD_CONTACTS, loadContacts)
}

export const contactlistSagas = [
  fork(watchLoadContacts)
]
