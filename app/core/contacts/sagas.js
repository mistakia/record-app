import { call, fork, takeLatest } from 'redux-saga/effects'

import { contactActions } from './actions'
import {
  fetchContact,
  requestConnectContact,
  requestDisconnectContact
} from '@core/api'

export function * loadContact ({ payload = {} }) {
  const { logId } = payload
  yield call(fetchContact, { logId })
}

export function * connectContact({ payload }) {
  const { logId, contactId } = payload
  yield call(requestConnectContact, { logId, contactId })
}

export function * disconnectContact({ payload }) {
  const { logId, contactId } = payload
  yield call(requestDisconnectContact, { logId, contactId })
}

export function * watchLoadContact () {
  yield takeLatest(contactActions.LOAD_CONTACT, loadContact)
}

export function * watchConnectContact () {
  yield takeLatest(contactActions.CONNECT_CONTACT, connectContact)
}

export function * watchDisconnectContact () {
  yield takeLatest(contactActions.DISCONNECT_CONTACT, disconnectContact)
}

export const contactSagas = [
  fork(watchConnectContact),
  fork(watchDisconnectContact),
  fork(watchLoadContact)
]
