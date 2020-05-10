import { call, fork, takeLatest, put } from 'redux-saga/effects'
import { goBack } from 'react-router-redux'

import {
  PEER_LOGLIST_ADDRESS,
  ALL_LOGLIST_ADDRESS
} from '@core/constants'
import {
  fetchLogs,
  fetchPeers,
  fetchAllLogs,
  postLogLink,
  deleteLogLink
} from '@core/api'
import { notificationActions } from '@core/notifications'
import { loglistActions } from './actions'
import history from '@core/history'

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
  yield fork(postLogLink, { logAddress, data })

  if (history.location.pathname.includes('/link-log')) {
    yield put(goBack())
  }
}

export function * unlinkLog ({ payload }) {
  const { logAddress } = payload
  const data = { linkAddress: logAddress }
  yield call(deleteLogLink, { logAddress, data })
}

export function * postLogFailed () {
  yield put(notificationActions.show({
    text: 'Failed to link library',
    dismiss: 2000
  }))
}

export function * deleteLogLinkFailed () {
  yield put(notificationActions.show({
    text: 'Failed to remove library',
    dismiss: 2000
  }))
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

export function * watchLoadPeerLogs () {
  yield takeLatest(loglistActions.LOAD_PEER_LOGS, loadPeerLogs)
}

export function * watchLoadAllLogs () {
  yield takeLatest(loglistActions.LOAD_ALL_LOGS, loadAllLogs)
}

export function * watchDeleteLogLinkFailed () {
  yield takeLatest(loglistActions.DELETE_LOG_LINK_FAILED, deleteLogLinkFailed)
}

export function * watchPostLogFailed () {
  yield takeLatest(loglistActions.POST_LOG_FAILED, postLogFailed)
}

export const loglistSagas = [
  fork(watchLoadLogs),
  fork(watchLinkLog),
  fork(watchUnlinkLog),
  fork(watchLoadPeerLogs),
  fork(watchLoadAllLogs),

  fork(watchPostLogFailed),
  fork(watchDeleteLogLinkFailed)
]
