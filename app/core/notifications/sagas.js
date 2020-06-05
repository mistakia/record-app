import { fork, take, select, put, delay, takeLatest } from 'redux-saga/effects'
import { push } from 'react-router-redux'

import { getApp } from '@core/app'
import { importerActions } from '@core/importer'
import { trackActions } from '@core/tracks'
import { notificationActions } from './actions'
import { getNotificationItem } from './selectors'
import { listensActions } from '@core/listens'
import { tracklistActions, getCurrentTracklist } from '@core/tracklists'
import { logActions } from '@core/logs'

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

export function * updateTracklist () {
  const tracklist = yield select(getCurrentTracklist)
  if (!tracklist.isOutdated) {
    return
  }

  const action = tracklistActions.loadTracks({ ...tracklist.toJS() })

  if (!tracklist.isPending && !tracklist.trackIds.size) {
    yield put(action)
  } else {
    yield put(notificationActions.show({
      text: 'New tracks available.',
      action: {
        text: 'Refresh',
        onclick: () => action
      }
    }))
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

export function * watchTracklistOutdated () {
  yield takeLatest([
    listensActions.POST_LISTEN_FULFILLED,
    importerActions.IMPORTER_PROCESSED_FILE,
    tracklistActions.POST_TRACK_FULFILLED,
    logActions.LOG_INDEX_UPDATED
  ], updateTracklist)
}

//= ====================================
//  ROOT
// -------------------------------------

export const notificationSagas = [
  fork(watchImporterFinished),
  fork(watchTrackAdded),
  fork(watchShowNotification),
  fork(watchTracklistOutdated)
]
