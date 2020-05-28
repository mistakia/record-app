import { fork, takeLatest, put } from 'redux-saga/effects'
import { postImporter } from '@core/api'

import { notificationActions } from '@core/notifications'
import { importerActions } from './actions'

export function * importerAdd ({ payload }) {
  const { address, data } = payload
  yield fork(postImporter, { address, data })
  yield put(notificationActions.show({
    text: 'Starting import',
    dismiss: 2000
  }))
}

export function * postImporterFailed () {
  yield put(notificationActions.show({
    text: 'Importer failed',
    dismiss: 2000
  }))
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function * watchImporterAdd () {
  yield takeLatest(importerActions.IMPORTER_ADD, importerAdd)
}

export function * watchPostImporterFailed () {
  yield takeLatest(importerActions.POST_IMPORTER_FAILED, postImporterFailed)
}

//= ====================================
//  ROOT
// -------------------------------------

export const importerSagas = [
  fork(watchImporterAdd),

  fork(watchPostImporterFailed)
]
