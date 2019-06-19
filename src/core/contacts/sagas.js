import { call, fork, takeLatest } from 'redux-saga/effects'

import { contactActions } from './actions'
import { fetchContact } from '@core/api'

export function * loadContact ({ payload = {} }) {
  const { logId } = payload
  yield call(fetchContact, { logId })
}

export function * peerLeft ({ payload }) {
  // TODO
}

export function * peerJoined ({ payload }) {
  // TODO
}

export function * watchPeerLeft () {
  yield takeLatest(contactActions.PEER_LEFT, peerLeft)
}

export function * watchPeerJoined () {
  yield takeLatest(contactActions.PEER_JOINED, peerJoined)
}

export function * watchLoadContact () {
  yield takeLatest(contactActions.LOAD_CONTACT, loadContact)
}

export const contactSagas = [
  fork(watchPeerLeft),
  fork(watchPeerJoined),
  fork(watchLoadContact)
]
