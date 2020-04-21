import { call, fork, takeLatest, put, select } from 'redux-saga/effects'
import { push } from 'react-router-redux'

import {
  PEER_LOGLIST_ADDRESS,
  ALL_LOGLIST_ADDRESS
} from '@core/constants'
import { getApp } from '@core/app'
import {
  fetchLogs,
  fetchPeers,
  fetchAllLogs,
  postLogLink,
  deleteLogLink
} from '@core/api'
import { loglistActions } from './actions'

export function * loadLogs ({ payload }) {
  const { logAddress } = payload
  yield call(fetchLogs, { logAddress })
}

export function * loadPeerLogs () {
  yield call(fetchPeers, { logAddress: PEER_LOGLIST_ADDRESS })
}

export function * loadAllLogs () {
  yield call(fetchAllLogs, { logAddress: ALL_LOGLIST_ADDRESS })
}

export function * linkLog ({ payload }) {
  const { logAddress, data } = payload
  yield call(postLogLink, { logAddress, data })
}

export function * unlinkLog ({ payload }) {
  const { logAddress, data } = payload
  yield call(deleteLogLink, { logAddress, data })
}

export function * goToMyLogs () {
  const app = yield select(getApp)
  yield put(push(`/logs${app.address}`))
}

export function * watchLoadLogs () {
  yield takeLatest(loglistActions.LOAD_LOGS, loadLogs)
}

export function * watchLinkLog () {
  yield takeLatest(loglistActions.LINK_LOG, linkLog)
}

export function * watchUnlinkLog () {
  yield takeLatest(loglistActions.UNLINK_LOG, unlinkLog)
}

export function * watchAddLogFulfilled () {
  yield takeLatest(loglistActions.POST_LOG_FULFILLED, goToMyLogs)
}

export function * watchLoadPeerLogs () {
  yield takeLatest(loglistActions.LOAD_PEER_LOGS, loadPeerLogs)
}

export function * watchLoadAllLogs () {
  yield takeLatest(loglistActions.LOAD_ALL_LOGS, loadAllLogs)
}

export const loglistSagas = [
  fork(watchLoadLogs),
  fork(watchLinkLog),
  fork(watchUnlinkLog),
  fork(watchAddLogFulfilled),
  fork(watchLoadPeerLogs),
  fork(watchLoadAllLogs)
]
