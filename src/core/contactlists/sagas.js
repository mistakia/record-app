import { call, fork, takeLatest, put } from 'redux-saga/effects'
import { push } from 'react-router-redux'

import { fetchContacts, postContact } from '@core/api'
import { contactlistActions } from './actions'

export function * loadContacts ({payload}) {
  const { logId } = payload
  yield call(fetchContacts, logId)
}

export function * addContact ({payload}) {
  const { logId, data } = payload
  yield call(postContact, logId, data)
}

export function * goToContacts () {
  yield put(push('/contacts/me'))
}

export function * watchLoadContacts () {
  yield takeLatest(contactlistActions.LOAD_CONTACTS, loadContacts)
}

export function * watchAddContact () {
  yield takeLatest(contactlistActions.ADD_CONTACT, addContact)
}

export function * watchAddContactFulfilled () {
  yield takeLatest(contactlistActions.POST_CONTACT_FULFILLED, goToContacts)
}

export const contactlistSagas = [
  fork(watchLoadContacts),
  fork(watchAddContact),
  fork(watchAddContactFulfilled)
]
