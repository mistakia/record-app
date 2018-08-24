import { call, fork, takeLatest, put, select } from 'redux-saga/effects'
import { push } from 'react-router-redux'

import { getApp } from '@core/app'
import { fetchContacts, postContact, deleteContact } from '@core/api'
import { contactlistActions } from './actions'

export function * loadContacts ({ payload = {} }) {
  const { logId } = payload
  yield call(fetchContacts, { logId })
}

export function * addContact ({ payload }) {
  const { logId, data } = payload
  yield call(postContact, { logId, data })
}

export function * removeContact ({ payload }) {
  const { logId, data } = payload
  yield call(deleteContact, { logId, data })
}

export function * goToContacts () {
  const app = yield select(getApp)
  yield put(push(`/contacts${app.address}`))
}

export function * watchLoadContacts () {
  yield takeLatest(contactlistActions.LOAD_CONTACTS, loadContacts)
}

export function * watchAddContact () {
  yield takeLatest(contactlistActions.ADD_CONTACT, addContact)
}

export function * watchRemoveContact () {
  yield takeLatest(contactlistActions.REMOVE_CONTACT, removeContact)
}

export function * watchAddContactFulfilled () {
  yield takeLatest(contactlistActions.POST_CONTACT_FULFILLED, goToContacts)
}

export const contactlistSagas = [
  fork(watchLoadContacts),
  fork(watchAddContact),
  fork(watchRemoveContact),
  fork(watchAddContactFulfilled)
]
