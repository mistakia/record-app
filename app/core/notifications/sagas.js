import { fork, take, select, put } from 'redux-saga/effects'
import { push } from 'react-router-redux'

import { getApp } from '@core/app'
import { importerActions } from '@core/importer'
import { trackActions } from '@core/tracks'
import { notificationActions } from './actions'

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

//= ====================================
//  ROOT
// -------------------------------------

export const notificationSagas = [
  fork(watchImporterFinished),
  fork(watchTrackAdded)
]
