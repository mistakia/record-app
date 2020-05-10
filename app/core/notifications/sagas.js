import { fork, take, select, put, delay } from 'redux-saga/effects'
import { push } from 'react-router-redux'

import { getApp } from '@core/app'
import { importerActions } from '@core/importer'
import { trackActions } from '@core/tracks'
import { notificationActions } from './actions'
import { getNotificationItem } from './selectors'

export function * importerFinished () {
  const app = yield select(getApp)
  yield put(notificationActions.show({
    text: 'Import finished',
    action: {
      text: 'Go to tracks',
      onclick: () => push(`/tracks${app.address}`)
    }
  }))
}

export function * trackAdded ({ data }) {
  const app = yield select(getApp)
  yield put(notificationActions.show({
    text: 'Track Added',
    action: {
      text: 'Go to tracks',
      onclick: () => push(`/tracks${app.address}`)
    }
  }))
}

export function * dismissNotification () {
  const item = yield select(getNotificationItem)
  if (item.dismiss) {
    yield delay(item.dismiss)
    yield put(notificationActions.dismiss(item.id))
  }
}

export function * showNotification (payload) {
  const item = yield select(getNotificationItem)
  if (item.id === payload.item.id && item.dismiss) {
    yield delay(item.dismiss)
    yield put(notificationActions.dismiss(item.id))
  }
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function * watchImporterFinished () {
  while (true) {
    yield take(importerActions.IMPORTER_FINISHED)
    yield fork(importerFinished)
  }
}

export function * watchTrackAdded () {
  while (true) {
    const { payload } = yield take(trackActions.TRACK_ADDED)
    yield fork(trackAdded, payload)
  }
}

export function * watchShowNotification () {
  while (true) {
    const { payload } = yield take(notificationActions.SHOW_NOTIFICATION)
    yield fork(showNotification, payload)
  }
}

export function * watchDismissNotification () {
  while (true) {
    yield take(notificationActions.DISMISS_NOTIFICATION)
    yield fork(dismissNotification)
  }
}

//= ====================================
//  ROOT
// -------------------------------------

export const notificationSagas = [
  fork(watchImporterFinished),
  fork(watchTrackAdded),
  fork(watchShowNotification)
]
